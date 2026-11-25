import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ProjectObjectives } from '@/components/projects/ProjectObjectives';
import { project, objective, task, renderWork } from './work-fixtures';
import api from '@/services/api';
import type { WorkObjective } from '@/types/work';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
const show = (objectives: WorkObjective[] = [objective], extras = {}) => renderWork(<ProjectObjectives project={{ ...project, objectives }} tasks={[task]} onAddTask={vi.fn()} onEditTask={vi.fn()} {...extras} />);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.get).mockResolvedValue({ data: project }); vi.mocked(api.patch).mockResolvedValue({ data: {} }); vi.mocked(api.post).mockResolvedValue({ data: {} }); });

it('mostra linhas com progresso independente do status e abre as tarefas no detalhe', async () => {
  const onAddTask = vi.fn(), onEditTask = vi.fn();
  show([{ ...objective, completedTasks: 1, cancelledTasks: 2 }], { onAddTask, onEditTask });
  const ring = screen.getByRole('progressbar');
  expect(ring).toHaveAttribute('aria-valuenow', '100');
  expect(ring.parentElement?.querySelector('.lucide-check')).toBeInTheDocument();
  expect(screen.queryByText('100%')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Status de .*: Planejado/ })).toBeInTheDocument();
  expect(screen.queryByLabelText('Título do objetivo')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Abrir objetivo/ }));
  const panel = screen.getByRole('dialog', { name: objective.title });
  expect(within(panel).getByText('1 de 1 tarefas concluídas')).toBeInTheDocument();
  expect(within(panel).getByText('2 canceladas · fora do cálculo de progresso')).toBeInTheDocument();
  expect(within(panel).queryByRole('textbox')).not.toBeInTheDocument();
  expect(within(panel).queryByRole('button', { name: 'Salvar objetivo' })).not.toBeInTheDocument();
  await userEvent.click(within(panel).getByRole('button', { name: task.title })); expect(onEditTask).toHaveBeenCalledWith(task);
  await userEvent.click(within(panel).getByRole('button', { name: 'Adicionar tarefa' })); expect(onAddTask).toHaveBeenCalledWith(objective.id);
  expect(api.patch).not.toHaveBeenCalled();
});

it('cria objetivo com descrição, período opcional e backlog', async () => {
  show();
  await userEvent.click(screen.getByRole('button', { name: 'Novo objetivo' }));
  const dialog = screen.getByRole('dialog', { name: 'Novo objetivo' });
  await userEvent.type(within(dialog).getByLabelText('Título do objetivo'), ' Publicar site ');
  await userEvent.type(within(dialog).getByLabelText('Descrição'), 'Receber os primeiros contatos');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Criar objetivo' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/project/9/objectives', {
    projectVersion: 4, title: 'Publicar site', description: 'Receber os primeiros contatos', startDate: null, dueDate: null, status: 'BACKLOG',
  }, { headers: { 'Idempotency-Key': expect.any(String) } }));
});

it('oferece os seis estados e altera apenas status com ID e versão', async () => {
  show();
  await userEvent.click(screen.getByRole('button', { name: /Status de/ }));
  expect(screen.getAllByRole('menuitemradio').map(item => item.textContent)).toEqual(['Backlog', 'Planejado', 'Em andamento', 'Pausado', 'Concluído', 'Cancelado']);
  await userEvent.click(screen.getByRole('menuitemradio', { name: 'Pausado' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/project/9/objectives/81', { version: 3, status: 'PAUSED' }));
});

it('filtra estados e permite limpar filtro sem esconder os dados permanentemente', async () => {
  show([objective, { ...objective, id: 82, title: 'Entrega concluída', status: 'CONCLUDED' }]);
  await userEvent.click(screen.getByRole('button', { name: 'Filtrar objetivos por status' }));
  await userEvent.click(screen.getByRole('menuitemradio', { name: 'Cancelado' }));
  expect(screen.getByText('Nenhum objetivo neste status')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Limpar filtro' }));
  expect(screen.getAllByRole('button', { name: /Abrir objetivo/ })).toHaveLength(2);
});

it('edita e limpa o período diretamente sem alterar o status', async () => {
  show([{ ...objective, startDate: '2026-11-01' }]);
  await userEvent.click(screen.getByRole('button', { name: /Período de/ }));
  expect(screen.getByRole('grid')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Limpar período' }));
  await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/project/9/objectives/81', { version: 3, startDate: null, dueDate: null }));
});

it('preserva rascunho quando salvar falha e pede confirmação ao fechar', async () => {
  vi.mocked(api.patch).mockRejectedValue(new Error('Falha ao salvar.'));
  show([{ ...objective, description: 'Texto original' }]);
  await userEvent.click(screen.getByRole('button', { name: /Ações do objetivo/ }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Editar objetivo' }));
  await userEvent.clear(screen.getByLabelText('Descrição'));
  await userEvent.type(screen.getByLabelText('Descrição'), 'Novo texto');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar objetivo' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalled());
  expect(screen.getByLabelText('Descrição')).toHaveValue('Novo texto');
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('alertdialog', { name: 'Descartar alterações?' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Descartar', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('reenvia criação incerta com os mesmos dados e chave', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce({ data: {} });
  show();
  await userEvent.click(screen.getByRole('button', { name: 'Novo objetivo' }));
  await userEvent.type(screen.getByLabelText('Título do objetivo'), 'Uma entrega');
  await userEvent.click(screen.getByRole('button', { name: 'Criar objetivo' }));
  await screen.findByRole('button', { name: 'Reenviar objetivo' });
  expect(screen.getByLabelText('Título do objetivo')).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Reenviar objetivo' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  expect(vi.mocked(api.post).mock.calls[1]).toEqual(vi.mocked(api.post).mock.calls[0]);
});

it('exclui com confirmação, ID e versões preservando as tarefas', async () => {
  vi.mocked(api.delete).mockResolvedValue({ data: {} }); show();
  await userEvent.click(screen.getByRole('button', { name: /Ações do objetivo/ }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir objetivo' }));
  expect(screen.getByText(/As tarefas serão preservadas/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Excluir objetivo', exact: true }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/project/9/objectives/81', { headers: { 'If-Match': '"3"', 'X-Project-Version': 4 } }));
});

it('abre objetivo selecionado pelo link e delega o fechamento para a URL', async () => {
  const onSelectObjective = vi.fn();
  show([objective], { selectedObjective: objective.id, onSelectObjective });
  expect(screen.getByRole('dialog', { name: objective.title })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Fechar objetivo' }));
  expect(onSelectObjective).toHaveBeenCalledWith(undefined);
});

it('oferece nova tentativa quando as tarefas do painel falham', async () => {
  const onReloadTasks = vi.fn();
  show([objective], { selectedObjective: objective.id, tasksError: new Error('Indisponível'), onReloadTasks });
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Recarregar dados' }));
  expect(onReloadTasks).toHaveBeenCalledOnce();
});

it('abre a edição explicitamente pelo menu do sheet e retorna à consulta ao cancelar', async () => {
  show([{ ...objective, description: 'Resultado esperado' }]);
  await userEvent.click(screen.getByRole('button', { name: /Abrir objetivo/ }));
  expect(screen.getByText('Resultado esperado')).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ações do objetivo aberto' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Editar objetivo' }));
  const editor = screen.getByRole('dialog', { name: 'Editar objetivo' });
  expect(within(editor).getByLabelText('Descrição')).toHaveValue('Resultado esperado');
  await userEvent.click(within(editor).getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.getByRole('dialog', { name: objective.title })).toBeInTheDocument());
});

it('altera status pelo sheet sem abrir o formulário de edição', async () => {
  show();
  await userEvent.click(screen.getByRole('button', { name: /Abrir objetivo/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Status do objetivo: Planejado' }));
  await userEvent.click(screen.getByRole('menuitemradio', { name: 'Em andamento' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/project/9/objectives/81', { version: 3, status: 'ON_DOING' }));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('mantém a lista acessível com o sheet aberto, como no painel de tarefas', async () => {
  show();
  await userEvent.click(screen.getByRole('button', { name: /Abrir objetivo/ }));
  expect(screen.getByRole('dialog', { name: objective.title })).toBeInTheDocument();
  const create = screen.getByRole('button', { name: 'Novo objetivo' });
  expect(create).toBeVisible();
  await userEvent.click(create);
  expect(screen.getByRole('dialog', { name: 'Novo objetivo' })).toBeInTheDocument();
});

it('leva aos itens de trabalho filtrados pelo objetivo', () => {
  show();
  expect(screen.getByRole('link', { name: `Ver itens de trabalho do objetivo ${objective.title}` }))
    .toHaveAttribute('href', `/tasks/project/${project.id}?tab=board&objective=${objective.id}`);
});

it('não oferece itens de trabalho em projeto sem quadro', () => {
  renderWork(<ProjectObjectives project={{ ...project, mode: 'SIMPLE', objectives: [objective] }} onAddTask={vi.fn()} onEditTask={vi.fn()} />);
  expect(screen.queryByRole('link', { name: /Ver itens de trabalho/ })).not.toBeInTheDocument();
});
