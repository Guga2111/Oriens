import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import { ProjectBoard } from '@/components/projects/ProjectBoard';
import { useProjectBoard } from '@/hooks/useWork';
import { BoardSettings } from '@/components/projects/BoardSettings';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import api from '@/services/api';
import { project, task, board, renderWork, pageOf } from './work-fixtures';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useGoogleMapsScript', () => ({ useGoogleMapsScript: () => ({ isLoaded: false }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn() } }));
beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async url => ({ data: String(url).startsWith('/task-labels/') ? [] : String(url).endsWith('board') ? board : String(url).includes('/project/user/') ? pageOf([project]) : project }));
  vi.mocked(api.post).mockResolvedValue({ data: { task, affectedProjectIds: [9], previousPlannedDate: null, plannedDate: null } });
  vi.mocked(api.patch).mockResolvedValue({ data: { task, affectedProjectIds: [9], previousPlannedDate: null, plannedDate: null } });
});
it('cria simples por padrão, sem objetivo obrigatório e com chave de idempotência', async () => {
  renderWork(<CreateProjectDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} />);
  expect(screen.getByRole('radio', { name: /Simples/ })).toHaveAttribute('aria-checked', 'true');
  await userEvent.type(screen.getByLabelText('Título do Projeto'), 'Viagem');
  await userEvent.click(screen.getByRole('button', { name: 'Criar Projeto' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/project/user/7', { title: 'Viagem', description: null, color: null, mode: 'SIMPLE', objectives: [] }, { headers: { 'Idempotency-Key': expect.any(String) } }));
});
it('cria tarefa pelo objetivo sem datas artificiais; vínculo pode ser removido', async () => {
  renderWork(<TaskEditor open onOpenChange={vi.fn()} projectId={9} objectiveId={81} />);
  await screen.findByText('Estado ao salvar: A fazer');
  await userEvent.type(screen.getByLabelText('Título'), 'Montar formulário');
  await userEvent.click(screen.getByRole('combobox', { name: 'Objetivo da tarefa' }));
  await userEvent.click(screen.getByRole('option', { name: 'Sem objetivo' }));
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/task/user/7', expect.objectContaining({ objectiveId: null, columnId: 11, projectId: 9, projectVersion: 4, plannedDate: null, startTime: null, dueDate: null, priority: 'NONE' }), expect.any(Object)));
});
it.each([
  ['0930', '09:30:00'],
  ['9:30', '09:30:00'],
  ['09:30', '09:30:00'],
  ['', null],
])('cria tarefa com dia planejado e horário %j', async (typed, startTime) => {
  const plannedDate = '2026-11-26';
  renderWork(<TaskEditor open onOpenChange={vi.fn()} plannedDate={plannedDate} />);
  await userEvent.type(screen.getByLabelText('Título'), 'Telefonar');
  if (typed) await userEvent.type(screen.getByRole('textbox', { name: /Horário/ }), typed);
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  expect(api.post).toHaveBeenCalledWith('/task/user/7', expect.objectContaining({ plannedDate, startTime }), expect.any(Object));
});
it('associa o erro de formato ao campo de horário e permite corrigir o rascunho', async () => {
  renderWork(<TaskEditor open onOpenChange={vi.fn()} plannedDate="2026-11-26" />);
  const time = screen.getByRole('textbox', { name: /Horário/ });
  await userEvent.type(screen.getByLabelText('Título'), 'Telefonar');
  await userEvent.type(time, '2400');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  expect(time).toHaveAccessibleDescription('Informe um horário válido, como 0930 ou 09:30.');
  expect(time).toHaveFocus();
  expect(api.post).not.toHaveBeenCalled();

  await userEvent.clear(time);
  await userEvent.type(time, '2359');
  expect(time).not.toHaveAttribute('aria-invalid', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  expect(api.post).toHaveBeenCalledWith('/task/user/7', expect.objectContaining({ startTime: '23:59:00' }), expect.any(Object));
});
it('pede o dia planejado quando o editor abre com horário e sem data', async () => {
  renderWork(<TaskEditor open onOpenChange={vi.fn()} startTime="09:30" />);
  await userEvent.type(screen.getByLabelText('Título'), 'Telefonar');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Selecione um dia planejado para informar o horário.');
  expect(api.post).not.toHaveBeenCalled();
});
it('timeout reenvia exatamente o mesmo payload e chave, preservando o rascunho', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new Error('timeout'));
  renderWork(<TaskEditor open onOpenChange={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('Título'), 'Telefonar');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  expect(await screen.findByText(/Confirmação indisponível/)).toBeInTheDocument();
  expect(screen.getByLabelText('Título')).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  expect(vi.mocked(api.post).mock.calls[1]).toEqual(vi.mocked(api.post).mock.calls[0]);
});
it('editor preserva estado e prazo ao retirar planejamento; conflito mantém rascunho', async () => {
  vi.mocked(api.patch).mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
  renderWork(<TaskEditor open onOpenChange={vi.fn()} task={{ ...task, plannedDate: '2026-11-14', startTime: '09:00:00', dueDate: '2026-11-20' }} />);
  await userEvent.click(screen.getByRole('button', { name: 'Limpar dia planejado' }));
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  expect(await screen.findByText(/Os dados mudaram/)).toBeInTheDocument();
  expect(screen.getByLabelText('Título')).toHaveValue(task.title);
  expect(api.patch).toHaveBeenCalledWith('/task/42', expect.objectContaining({ version: 2, projectVersion: 4, plannedDate: null, startTime: null, dueDate: '2026-11-20' }));
  expect(vi.mocked(api.patch).mock.calls[0][1]).not.toHaveProperty('status');
  expect(vi.mocked(api.patch).mock.calls[0][1]).not.toHaveProperty('columnId');
});
it('troca de projeto exige coluna explícita e remove objetivo com aviso', async () => {
  const other = { ...project, id: 10, title: 'Livro', version: 6 };
  vi.mocked(api.get).mockImplementation(async url => ({ data: String(url).startsWith('/task-labels/') ? [] : String(url).includes('/user/') ? pageOf([project, other]) : String(url).endsWith('/board') ? { ...board, columns: board.columns.map(c => ({ ...c, id: c.id + 10, projectId: 10 })) } : String(url) === '/project/10' ? other : project }));
  renderWork(<TaskEditor open onOpenChange={vi.fn()} task={task} />);
  await userEvent.click(screen.getByRole('combobox', { name: 'Projeto da tarefa' }));
  await userEvent.click(await screen.findByRole('option', { name: 'Livro' }));
  expect(await screen.findByText(/O objetivo anterior foi removido/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  expect(await screen.findByText('Escolha uma coluna válida no projeto de destino.')).toBeInTheDocument();
  expect(api.patch).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('combobox', { name: 'Coluna de destino' }));
  await userEvent.click(screen.getByRole('option', { name: 'Fazendo · Em andamento' }));
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', expect.objectContaining({ projectId: 10, objectiveId: null, columnId: 22, projectVersion: 4, targetProjectVersion: 6 })));
});
it('mover pelo menu usa o mesmo PATCH, e filtros retiram reordenação oculta', async () => {
  const filters = { open: true };
  vi.mocked(api.get).mockResolvedValue({ data: { ...board, filtered: true } });
  function FilteredBoard() {
    const query = useProjectBoard(9, filters);
    return query.data && <ProjectBoard pendingColumnId={11} board={query.data} filters={filters}
      onOpen={vi.fn()} onEdit={vi.fn()} onAdd={vi.fn()} onObjective={vi.fn()} />;
  }
  renderWork(<FilteredBoard />);
  await userEvent.click(await screen.findByRole('button', { name: `Ações da tarefa ${task.title}` }));
  expect(screen.queryByRole('menuitem', { name: 'Mover acima' })).toBeNull();
  await userEvent.click(screen.getByRole('menuitem', { name: 'Concluídas · Concluída' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { version: 2, projectVersion: 4, columnId: 13, beforeTaskId: null }));
});
it('configuração bloqueia mudar significado de coluna ocupada', async () => {
  renderWork(<BoardSettings onReload={async () => board} project={project} board={board} onClose={vi.fn()} />);
  await userEvent.click(screen.getAllByRole('button', { name: 'Renomear / significado' })[0]);
  expect(screen.getByRole('combobox', { name: 'Significado da coluna' })).toBeDisabled();
});

it('remover coluna ocupada usa total geral e mostra o novo estado antes de confirmar', async () => {
  renderWork(<BoardSettings onReload={async () => board} project={project} board={{ ...board, filtered: true, columns: board.columns.map(c => c.id === 11 ? { ...c, visibleCount: 0 } : c) }} onClose={vi.fn()} />);
  await userEvent.click(screen.getAllByRole('button', { name: 'Excluir coluna' })[0]);
  expect(screen.getByText(/1 tarefas serão movidas/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirmar exclusão da coluna' })).toBeDisabled();
  await userEvent.click(screen.getByRole('combobox', { name: 'Destino das tarefas' }));
  await userEvent.click(screen.getByRole('option', { name: 'Concluídas · Concluída' }));
  expect(screen.getByText('Estado resultante das tarefas: Concluída')).toBeInTheDocument();
  // This is the last PENDING/default column. A completed destination cannot substitute for it.
  expect(screen.getByRole('button', { name: 'Confirmar exclusão da coluna' })).toBeDisabled();
  expect(api.post).not.toHaveBeenCalled();
});
it('reordenação de coluna envia todos os IDs, inclusive colunas sem tarefas', async () => {
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  renderWork(<BoardSettings onReload={async () => board} project={project} board={board} onClose={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Mover coluna A fazer para a direita' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/project/9/columns/order', { projectVersion: 4, columnIds: [12, 11, 13] }));
});
it('cancelar rascunho pede descarte e nenhuma escrita acontece', async () => {
  const close = vi.fn();
  renderWork(<TaskEditor open onOpenChange={close} />);
  await userEvent.type(screen.getByLabelText('Título'), 'Rascunho');
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
  expect(close).toHaveBeenCalledWith(false);
  expect(api.post).not.toHaveBeenCalled();
});
