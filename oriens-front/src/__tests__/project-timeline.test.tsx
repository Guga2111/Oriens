import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProjectTimeline } from '@/components/projects/ProjectTimeline';
import api from '@/services/api';
import type { BoardResponse, WorkTask } from '@/types/work';
import { board, objective, project, renderWork, task } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useProductToday', () => ({ useProductToday: () => '2026-11-18' }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn() } }));

const make = (id: number, fields: Partial<WorkTask>): WorkTask => ({ ...task, id, ...fields });
const second = { ...objective, id: 82, title: 'Publicar', position: 1, dueDate: null, nonCancelledTasks: 0, completedTasks: 0 };
const timelineProject = { ...project, objectives: [second, { ...objective, nonCancelledTasks: 6, completedTasks: 2 }] };
const tasks = [
  make(1, { title: 'API de leitura', objectiveId: 81, plannedDate: '2026-11-16', dueDate: '2026-11-17', status: 'PENDING' }),
  make(2, { title: 'Escrever testes', objectiveId: 81, plannedDate: '2026-11-19', status: 'ON_DOING' }),
  make(3, { title: 'Revisar', objectiveId: null, dueDate: '2026-11-24' }),
  make(4, { title: 'Ideia solta', objectiveId: 81 }),
  make(5, { title: 'Descartada', objectiveId: 81, status: 'CANCELLED', plannedDate: '2026-11-19' }),
];
const counts = { totalTasks: 5, nonCancelledTasks: 4, completedTasks: 0, cancelledTasks: 1 };
const response: BoardResponse = { ...board, filtered: true, tasks, total: counts, visible: counts };

function Location() { const location = useLocation(); return <output aria-label="url">{location.search}</output>; }
function show(data = response, route = '/projects/9?tab=timeline&anchor=2026-11-18') {
  vi.mocked(api.get).mockResolvedValue({ data });
  const onOpen = vi.fn();
  renderWork(<TooltipProvider><ProjectTimeline project={timelineProject} onOpen={onOpen} /><Location /></TooltipProvider>, route);
  return onOpen;
}
beforeEach(() => { vi.mocked(api.get).mockReset(); });

it('fetches the fortnight window and groups rows by objective position, "Sem objetivo" last', async () => {
  show();
  const region = await screen.findByRole('region', { name: 'Timeline do projeto' });
  expect(api.get).toHaveBeenCalledWith('/project/9/board', expect.objectContaining({ params: { startDate: '2026-10-19', endDate: '2027-02-07' } }));
  const groups = within(region).getAllByRole('button').filter(button => button.hasAttribute('aria-expanded'));
  expect(groups.map(g => g.getAttribute('aria-label'))).toEqual([
    'Receber contatos pelo site, 2 de 6 tarefas concluídas, prazo 20 nov',
    'Publicar, 0 de 0 tarefas concluídas',
    'Sem objetivo, 1 tarefa no período',
  ]);
  expect(groups[0]).toHaveAttribute('aria-expanded', 'true');
  expect(groups[1]).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByText('1 cancelada oculta')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Descartada/ })).not.toBeInTheDocument();
});

it('names bars by state and dates, flags overdue, and opens the task on click', async () => {
  const onOpen = show();
  const late = await screen.findByRole('button', { name: 'API de leitura, a fazer, planejada 16 nov, prazo 17 nov, atrasada' });
  expect(screen.getByRole('button', { name: 'Escrever testes, em andamento, planejada 19 nov, sem prazo' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Revisar, a fazer, sem planejamento, prazo 24 nov' })).toBeInTheDocument();
  await userEvent.click(late);
  expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  const undated = screen.getByRole('region', { name: /Sem data/ });
  await userEvent.click(within(undated).getByRole('button', { name: /Ideia solta/ }));
  expect(onOpen).toHaveBeenLastCalledWith(expect.objectContaining({ id: 4 }));
});

it('keeps scale and anchor in the URL', async () => {
  show();
  await screen.findByRole('region', { name: 'Timeline do projeto' });
  await userEvent.click(screen.getByRole('radio', { name: 'Semana' }));
  expect(screen.getByLabelText('url')).toHaveTextContent('scale=week');
  await userEvent.click(screen.getByRole('button', { name: 'Próximo período' }));
  expect(screen.getByLabelText('url')).toHaveTextContent('anchor=2026-12-16');
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/project/9/board', expect.objectContaining({ params: { startDate: '2026-11-30', endDate: '2027-01-24' } })));
  await userEvent.click(screen.getByRole('button', { name: 'Hoje' }));
  expect(screen.getByLabelText('url')).not.toHaveTextContent('anchor=');
});

it('shows an empty window inside the grid frame', async () => {
  const outside = { ...counts, totalTasks: 3 };
  show({ ...response, tasks: [], total: outside, visible: { ...counts, totalTasks: 0 } });
  expect(await screen.findByText('Nenhuma tarefa neste período · 3 fora do período')).toBeInTheDocument();
});

it('shows the empty project state without the grid', async () => {
  const none = { totalTasks: 0, nonCancelledTasks: 0, completedTasks: 0, cancelledTasks: 0 };
  show({ ...response, tasks: [], total: none, visible: none });
  expect(await screen.findByText('Nenhuma tarefa neste projeto')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Timeline do projeto' })).not.toBeInTheDocument();
});

it('offers a retry when the board fails to load', async () => {
  vi.mocked(api.get).mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  renderWork(<TooltipProvider><ProjectTimeline project={timelineProject} onOpen={vi.fn()} /></TooltipProvider>, '/projects/9');
  expect(await screen.findByRole('alert')).toHaveTextContent('Recurso indisponível ou sem acesso.');
  expect(screen.getByRole('button', { name: 'Recarregar dados' })).toBeInTheDocument();
});
