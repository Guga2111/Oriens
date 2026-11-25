import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import api from '@/services/api';
import { board, pageOf, project, renderWork, task } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useGoogleMapsScript', () => ({ useGoogleMapsScript: () => ({ isLoaded: false }) }));
vi.mock('@/context/SettingsContext', () => ({
  useSettings: () => ({ preferences: { notifications: true, sound: false, theme: 'light', taskView: 'peek' }, updatePreference: vi.fn() }),
}));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

const detailed = { ...task, location: { address: 'Av. Paulista, 1000' } };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation(async url => {
    const path = String(url);
    if (path.startsWith('/task-labels/')) return { data: [] };
    if (path === '/task/42') return { data: detailed };
    if (path.endsWith('/board')) return { data: { ...board, tasks: [detailed] } };
    if (path.includes('/project/user/')) return { data: pageOf([project]) };
    return { data: project };
  });
  vi.mocked(api.patch).mockResolvedValue({ data: { task: { ...detailed, columnId: 12, version: 3 }, affectedProjectIds: [9], previousPlannedDate: null, plannedDate: null } });
  vi.mocked(api.delete).mockResolvedValue({ data: { id: 42, affectedProjectIds: [9], previousPlannedDate: null } });
});
const page = (route = '/tasks/project/9') => renderWork(<Routes><Route path="/tasks/project/:id" element={<ProjectDetailPage />} /></Routes>, route);

it('o quadro abre a tarefa no mesmo painel de Hoje', async () => {
  page();
  await userEvent.click(await screen.findByRole('button', { name: task.title }));
  const panel = await screen.findByRole('dialog', { name: task.title });
  expect(within(panel).getByRole('textbox', { name: 'Título da tarefa' })).toHaveValue(task.title);
  expect(within(panel).getByText('Av. Paulista, 1000')).toBeInTheDocument();
});

it('move a tarefa de coluna pelo painel com as versões atuais', async () => {
  page('/tasks/project/9?task=42');
  const panel = await screen.findByRole('dialog', { name: task.title });
  await userEvent.click(within(panel).getByRole('button', { name: 'Coluna: A fazer' }));
  await userEvent.click(await screen.findByRole('option', { name: 'Fazendo' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { columnId: 12, beforeTaskId: null, version: 2, projectVersion: 4 }));
});

it('edita pelo editor existente e volta ao painel ao cancelar', async () => {
  page('/tasks/project/9?task=42');
  const panel = await screen.findByRole('dialog', { name: task.title });
  await userEvent.click(within(panel).getByRole('button', { name: `Ações da tarefa ${task.title}` }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));
  expect(await screen.findByRole('dialog', { name: 'Editar tarefa' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(await screen.findByRole('dialog', { name: task.title })).toBeInTheDocument();
});

it('exclui só depois de confirmar e fecha o painel', async () => {
  page('/tasks/project/9?task=42');
  const panel = await screen.findByRole('dialog', { name: task.title });
  await userEvent.click(within(panel).getByRole('button', { name: `Ações da tarefa ${task.title}` }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Excluir' }));
  expect(api.delete).not.toHaveBeenCalled();
  await userEvent.click(await screen.findByRole('button', { name: 'Excluir tarefa' }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/task/42', expect.any(Object)));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: task.title })).not.toBeInTheDocument());
});
