import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import api from '@/services/api';
import type { WorkTask } from '@/types/work';
import { board, pageOf, project, renderWork, task } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useGoogleMapsScript', () => ({ useGoogleMapsScript: () => ({ isLoaded: false }) }));
vi.mock('@/hooks/useProductToday', () => ({ useProductToday: () => '2026-11-18' }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

// Only the timeline window knows this task, so a placeholder can come from nowhere else.
const scheduled: WorkTask = { ...task, id: 51, title: 'API de leitura', plannedDate: '2026-11-16', dueDate: '2026-11-20' };
const barName = 'API de leitura, a fazer, planejada 16 nov, prazo 20 nov';

const windowed = { ...board, filtered: true, tasks: [scheduled] };
function serve(current = project, timeline = windowed) {
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    const path = String(url);
    if (path.startsWith('/task-labels/')) return { data: [] };
    // The detail never answers: the dialog can only show the placeholder.
    if (path.startsWith('/task/')) return new Promise(() => {});
    if (path.endsWith('/board')) return { data: config?.params?.startDate ? timeline : board };
    if (path.includes('/project/user/')) return { data: pageOf([current]) };
    return { data: current };
  });
}
function Location() { return <output aria-label="url">{useLocation().search}</output>; }
const show = (route: string) => renderWork(<TooltipProvider><Routes><Route path="/tasks/project/:id" element={<><ProjectDetailPage /><Location /></>} /></Routes></TooltipProvider>, route);

beforeEach(() => { vi.clearAllMocks(); serve(); });

it('?tab=timeline selects the Timeline tab and renders the timeline region', async () => {
  show('/tasks/project/9?tab=timeline');
  expect(await screen.findByRole('region', { name: 'Timeline do projeto' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByRole('combobox', { name: 'Filtrar por objetivo' })).not.toBeInTheDocument();
});

it('clicking a bar puts ?task in the URL and opens the details with the timeline placeholder', async () => {
  show('/tasks/project/9?tab=timeline&scale=week&anchor=2026-11-18');
  await userEvent.click(await screen.findByRole('button', { name: barName }));
  expect(screen.getByLabelText('url')).toHaveTextContent('?tab=timeline&scale=week&anchor=2026-11-18&task=51');
  expect(await screen.findByRole('dialog', { name: scheduled.title })).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/task/51', expect.anything());
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('url')).toHaveTextContent('?tab=timeline&scale=week&anchor=2026-11-18');
  expect(screen.getByLabelText('url')).not.toHaveTextContent('task=');
});

it('a deep link with ?tab=timeline&task=ID opens the details dialog', async () => {
  show('/tasks/project/9?tab=timeline&task=51');
  const dialog = await screen.findByRole('dialog', { name: scheduled.title });
  expect(within(dialog).getByRole('button', { name: /Editar/ })).toBeInTheDocument();
  // The modal dialog hides the page behind it from the accessibility tree.
  expect(screen.getByRole('tab', { name: 'Timeline', hidden: true })).toHaveAttribute('aria-selected', 'true');
});

it('"Nova tarefa" in the empty timeline opens the page TaskEditor', async () => {
  const none = { totalTasks: 0, nonCancelledTasks: 0, completedTasks: 0, cancelledTasks: 0 };
  serve(project, { ...windowed, tasks: [], total: none, visible: none });
  show('/tasks/project/9?tab=timeline');
  const panel = await screen.findByRole('tabpanel', { name: 'Timeline' });
  await within(panel).findByText('Nenhuma tarefa neste projeto');
  await userEvent.click(within(panel).getByRole('button', { name: 'Nova tarefa' }));
  expect(await screen.findByRole('dialog', { name: 'Nova tarefa' })).toBeInTheDocument();
});

it('an unknown ?tab falls back to the board', async () => {
  show('/tasks/project/9?tab=gantt');
  expect(await screen.findByRole('tab', { name: 'Quadro' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByRole('region', { name: 'Timeline do projeto' })).not.toBeInTheDocument();
});

it('a SIMPLE project has no Timeline tab', async () => {
  serve({ ...project, mode: 'SIMPLE' });
  show('/tasks/project/9?tab=timeline');
  expect(await screen.findByRole('heading', { name: project.title })).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Timeline' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Timeline do projeto' })).not.toBeInTheDocument();
});
