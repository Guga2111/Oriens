import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import ProjectsPage from '@/pages/ProjectsPage';
import api from '@/services/api';
import { project, renderWork, pageOf } from './work-fixtures';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
beforeEach(() => {
  vi.mocked(api.get).mockImplementation(async url => ({ data: String(url).endsWith('deletion-preview') ? { projectVersion: 8, objectiveCount: 1, columnCount: 3, taskCount: 5 } : String(url).endsWith('summary') ? { activeProjects: 1, favoriteProjects: 0 } : pageOf([project]) }));
});
it('exclusão apresenta consequências, exige ciência e envia a versão do preview', async () => {
  vi.mocked(api.delete).mockResolvedValue({});
  renderWork(<ProjectsPage />);
  await userEvent.click(await screen.findByRole('button', { name: `Ações do projeto ${project.title}` }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir' }));
  expect(await screen.findByText(/As 5 tarefas serão preservadas/)).toBeInTheDocument();
  const remove = screen.getByRole('button', { name: 'Excluir projeto' });
  expect(remove).toBeDisabled();
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(remove);
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/project/9', { headers: { 'If-Match': '"8"' } }));
});
it('conflito preserva a confirmação, exige novo preview e não exclui de novo sozinho', async () => {
  vi.mocked(api.delete).mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
  renderWork(<ProjectsPage />);
  await userEvent.click(await screen.findByRole('button', { name: `Ações do projeto ${project.title}` }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Excluir' }));
  await screen.findByText(/As 5 tarefas/);
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(screen.getByRole('button', { name: 'Excluir projeto' }));
  expect(await screen.findByText(/Os dados mudaram/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Excluir projeto' })).toBeDisabled();
  expect(api.delete).toHaveBeenCalledTimes(1);
});
