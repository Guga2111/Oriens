import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { TaskDetailsDialog } from '@/components/tasks/TaskDetailsDialog';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import api from '@/services/api';
import { project, task, board, renderWork, pageOf } from './work-fixtures';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useGoogleMapsScript', () => ({ useGoogleMapsScript: () => ({ isLoaded: false }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

const detailed = { ...task, description: 'Primeira linha\nSegunda linha', plannedDate: '2026-11-18', startTime: '09:30:00', dueDate: '2026-11-20', location: { address: 'Av. Paulista, 1000' } };
const mutation = { task: { ...detailed, columnId: 12, version: 3 }, affectedProjectIds: [9], previousPlannedDate: null, plannedDate: null };
function serve(current: unknown = detailed) {
  vi.mocked(api.get).mockImplementation(async url => {
    const path = String(url);
    if (path.startsWith('/task-labels/')) return { data: [] };
    if (path === '/task/42') return { data: current };
    if (path.endsWith('/board')) return { data: { ...board, tasks: [detailed] } };
    if (path.includes('/project/user/')) return { data: pageOf([project]) };
    return { data: project };
  });
}
const props = { taskId: 42, projectId: 9, columns: board.columns, onClose: vi.fn(), onEdit: vi.fn(), onObjective: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  serve();
  vi.mocked(api.patch).mockResolvedValue({ data: mutation });
  vi.mocked(api.delete).mockResolvedValue({ data: { id: 42, affectedProjectIds: [9], previousPlannedDate: null } });
});

it('mostra todas as informações da tarefa em leitura', async () => {
  renderWork(<TaskDetailsDialog {...props} />);
  const dialog = await screen.findByRole('dialog', { name: task.title });
  expect(within(dialog).getByText(/Primeira linha\s+Segunda linha/)).toBeInTheDocument();
  expect(within(dialog).getByText('Prioridade média')).toBeInTheDocument();
  expect(within(dialog).getByText('18 de novembro de 2026')).toBeInTheDocument();
  expect(within(dialog).getByText('· 09:30')).toBeInTheDocument();
  expect(within(dialog).getByText('Av. Paulista, 1000')).toBeInTheDocument();
  expect(within(dialog).getByText('1 de novembro de 2026')).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole('button', { name: task.objective!.title }));
  expect(props.onObjective).toHaveBeenCalledWith(81);
});

it('move a tarefa para o fim de outra coluna com as versões atuais', async () => {
  renderWork(<TaskDetailsDialog {...props} />);
  await userEvent.click(await screen.findByRole('button', { name: /Mover para/ }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Fazendo · Em andamento' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { version: 2, projectVersion: 4, columnId: 12, beforeTaskId: null }));
});

it('exclui somente após confirmação e fecha os detalhes', async () => {
  renderWork(<TaskDetailsDialog {...props} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
  expect(api.delete).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/task/42', expect.any(Object)));
  await waitFor(() => expect(props.onClose).toHaveBeenCalled());
});

it('não oferece ações para tarefa de outro projeto nem para tarefa inexistente', async () => {
  serve({ ...detailed, projectId: 10, project: { id: 10, title: 'Livro', archived: false, version: 1 } });
  const { unmount } = renderWork(<TaskDetailsDialog {...props} />);
  expect(await screen.findByText('Tarefa não encontrada neste projeto.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  unmount();
  vi.mocked(api.get).mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  renderWork(<TaskDetailsDialog {...props} />);
  expect(await screen.findByText('Tarefa não encontrada neste projeto.')).toBeInTheDocument();
});

it('abre pelo cartão, edita pelo editor existente e volta aos detalhes', async () => {
  renderWork(<Routes><Route path="/tasks/project/:id" element={<ProjectDetailPage />} /></Routes>, '/tasks/project/9');
  await userEvent.click(await screen.findByRole('button', { name: task.title }));
  const details = await screen.findByRole('dialog', { name: task.title });
  await userEvent.click(within(details).getByRole('button', { name: 'Editar' }));
  expect(await screen.findByRole('dialog', { name: 'Editar tarefa' })).toBeInTheDocument();
  expect(screen.getByLabelText('Título')).toHaveValue(task.title);
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(await screen.findByRole('dialog', { name: task.title })).toBeInTheDocument();
});

it('abre os detalhes direto pelo link ?task=ID', async () => {
  renderWork(<Routes><Route path="/tasks/project/:id" element={<ProjectDetailPage />} /></Routes>, '/tasks/project/9?task=42');
  const dialog = await screen.findByRole('dialog', { name: task.title });
  expect(within(dialog).getByText('Av. Paulista, 1000')).toBeInTheDocument();
});
