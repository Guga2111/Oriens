import { useState } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import { TaskLabelPicker } from '@/components/tasks/TaskLabelPicker';
import { TaskLabels } from '@/components/tasks/TaskLabels';
import api from '@/services/api';
import { renderWork, pageOf, task } from './work-fixtures';
import type { TaskLabel } from '@/types/task-label';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useGoogleMapsScript', () => ({ useGoogleMapsScript: () => ({ isLoaded: false }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
let labels: TaskLabel[];
beforeEach(() => {
  labels = [{ id: 1, name: 'Frontend', color: 'BLUE', version: 0 }, { id: 2, name: 'Pesquisa', color: 'YELLOW', version: 3 }];
  vi.mocked(api.get).mockImplementation(async url => ({ data: String(url).startsWith('/task-labels/') ? labels : pageOf([]) }));
  vi.mocked(api.post).mockImplementation(async (url, body) => {
    if (String(url).startsWith('/task-labels/')) {
      const created = { ...(body as object), id: 3, version: 0 } as TaskLabel; labels = [...labels, created]; return { data: created };
    }
    return { data: { task: { id: 10 }, affectedProjectIds: [], previousPlannedDate: null, plannedDate: null } };
  });
});
function Picker() { const [value, setValue] = useState<number[]>([]); return <TaskLabelPicker value={value} onChange={setValue} />; }

it('seleciona várias etiquetas por conta e salva os IDs junto da tarefa avulsa', async () => {
  renderWork(<TaskEditor open onOpenChange={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('Título'), 'Preparar apresentação');
  await userEvent.click(screen.getByLabelText('Etiquetas', { selector: 'button' }));
  await userEvent.click(await screen.findByRole('checkbox', { name: 'Pesquisa' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Frontend' }));
  await userEvent.keyboard('{Escape}');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar tarefa' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/task/user/7', expect.objectContaining({ title: 'Preparar apresentação', labelIds: [1,2] }), expect.any(Object)));
});

it('cria com cor, reutiliza o catálogo e seleciona a etiqueta criada no rascunho', async () => {
  renderWork(<Picker />);
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar etiquetas' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Criar etiqueta' }));
  const dialog = screen.getByRole('dialog', { name: 'Criar etiqueta' });
  await userEvent.type(within(dialog).getByLabelText('Nome da etiqueta'), 'Backend');
  await userEvent.click(within(dialog).getByRole('radio', { name: 'Verde' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar etiqueta' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/task-labels/user/7', { name: 'Backend', color: 'GREEN' }, { headers: { 'Idempotency-Key': expect.any(String) } }));
  expect(await screen.findByRole('button', { name: 'Remover etiqueta Backend desta tarefa' })).toBeInTheDocument();
});

it('edição global preserva o rascunho em conflito e usa a versão lida', async () => {
  vi.mocked(api.put).mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
  renderWork(<Picker />);
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar etiquetas' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Editar etiqueta Pesquisa' }));
  await userEvent.clear(screen.getByLabelText('Nome da etiqueta')); await userEvent.type(screen.getByLabelText('Nome da etiqueta'), 'Descoberta');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar etiqueta' }));
  expect(await screen.findByText(/Os dados mudaram/)).toBeInTheDocument();
  expect(screen.getByLabelText('Nome da etiqueta')).toHaveValue('Descoberta');
  expect(api.put).toHaveBeenCalledWith('/task-labels/2', { name: 'Descoberta', color: 'YELLOW' }, { headers: { 'If-Match': '"3"' } });
});

it('excluir exige confirmação global e invalida as projeções das tarefas', async () => {
  vi.mocked(api.delete).mockImplementation(async () => { labels = labels.filter(label => label.id !== 1); return { data: null }; });
  const { client } = renderWork(<Picker />);
  client.setQueryData(['work',7,'tasks/detail',10], { id: 10 });
  client.setQueryData(['work',7,'projects/board',9,{}], {});
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar etiquetas' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Editar etiqueta Frontend' }));
  await userEvent.click(screen.getByRole('button', { name: 'Excluir etiqueta' }));
  expect(api.delete).not.toHaveBeenCalled();
  const confirmation = screen.getByRole('alertdialog');
  expect(confirmation).toHaveTextContent('todas as suas tarefas');
  await userEvent.click(within(confirmation).getByRole('button', { name: 'Excluir etiqueta' }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/task-labels/1', { headers: { 'If-Match': '"0"' } }));
  expect(client.getQueryState(['work',7,'tasks/detail',10])?.isInvalidated).toBe(true);
  expect(client.getQueryState(['work',7,'projects/board',9,{}])?.isInvalidated).toBe(true);
});

it('timeout de criação reenvia a mesma etiqueta com a mesma chave', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new Error('timeout'));
  renderWork(<Picker />);
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar etiquetas' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Criar etiqueta' }));
  await userEvent.type(screen.getByLabelText('Nome da etiqueta'), 'Entrega');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar etiqueta' }));
  expect(await screen.findByText(/Confirmação indisponível/)).toBeInTheDocument();
  expect(screen.getByLabelText('Nome da etiqueta')).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Salvar etiqueta' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  expect(vi.mocked(api.post).mock.calls[1]).toEqual(vi.mocked(api.post).mock.calls[0]);
});

it('os nomes continuam visíveis, sem depender apenas da cor', () => {
  renderWork(<TaskLabels labels={labels} />);
  expect(screen.getByRole('list', { name: 'Etiquetas da tarefa' })).toHaveTextContent('Frontend');
  expect(screen.getByRole('list', { name: 'Etiquetas da tarefa' })).toHaveTextContent('Pesquisa');
});

it('salvar o catálogo dentro do editor não envia o formulário da tarefa por propagação do portal', async () => {
  renderWork(<TaskEditor open onOpenChange={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('Título'), 'Rascunho com etiqueta');
  await userEvent.click(screen.getByLabelText('Etiquetas', { selector: 'button' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Criar etiqueta' }));
  await userEvent.type(screen.getByLabelText('Nome da etiqueta'), 'Entrega');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar etiqueta' }));
  await screen.findByRole('button', { name: 'Remover etiqueta Entrega desta tarefa' });
  expect(vi.mocked(api.post).mock.calls.map(call => call[0])).toEqual(['/task-labels/user/7']);
  expect(screen.getByLabelText('Título')).toHaveValue('Rascunho com etiqueta');
});

it('exclusão global já confirmada não cria uma falsa alteração pendente na tarefa', async () => {
  vi.mocked(api.delete).mockImplementation(async () => { labels = labels.filter(label => label.id !== 1); return { data: null }; });
  const close = vi.fn();
  renderWork(<TaskEditor open onOpenChange={close} task={{ ...task, projectId: null, objectiveId: null, columnId: null, position: null, project: null, objective: null, column: null, labels: [labels[0]] }} />);
  await userEvent.click(screen.getByLabelText('Etiquetas', { selector: 'button' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Editar etiqueta Frontend' }));
  await userEvent.click(screen.getByRole('button', { name: 'Excluir etiqueta' }));
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir etiqueta' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar etiqueta' })).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(close).toHaveBeenCalledWith(false);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('no celular o foco entra no formulário da etiqueta, sem ficar no botão atrás do diálogo', async () => {
  const width = window.innerWidth; window.innerWidth = 390;
  try {
    renderWork(<Picker />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar etiquetas' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Criar etiqueta' }));
    await waitFor(() => expect(screen.getByLabelText('Nome da etiqueta')).toHaveFocus());
  } finally { window.innerWidth = width; }
});
