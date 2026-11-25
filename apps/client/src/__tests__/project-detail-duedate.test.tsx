import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ProjectObjectives } from '@/components/projects/ProjectObjectives';
import api from '@/services/api';
import { project, renderWork } from './work-fixtures';
import { validCalendarDate } from '@/lib/work-form';
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it('objetivo é editado por ID e versão; limpar prazo não envia status', async () => {
  vi.mocked(api.patch).mockResolvedValue({ data: {} });
  renderWork(<ProjectObjectives project={project} onAddTask={vi.fn()} onEditTask={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /Ações do objetivo/ }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Editar objetivo' }));
  await userEvent.click(screen.getByRole('button', { name: 'Limpar data de término' }));
  await userEvent.click(screen.getByRole('button', { name: 'Salvar objetivo' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/project/9/objectives/81', { version: 3, dueDate: null }));
});
it('datas impossíveis não são normalizadas', () => {
  expect(validCalendarDate('2026-02-29')).toBe(false);
  expect(validCalendarDate('2028-02-29')).toBe(true);
  expect(validCalendarDate('2026-04-31')).toBe(false);
});
it('concluir tarefas só sugere conclusão do objetivo, sem escrita automática', async () => {
  renderWork(<ProjectObjectives project={{ ...project, objectives: [{ ...project.objectives![0], completedTasks: 1 }] }} onAddTask={vi.fn()} onEditTask={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /Abrir objetivo/ }));
  expect(screen.getByText(/O resultado foi alcançado/)).toBeInTheDocument();
  expect(api.patch).not.toHaveBeenCalled();
});
