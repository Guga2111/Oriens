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
  const onOpen = vi.fn(); const onAdd = vi.fn();
  renderWork(<TooltipProvider><ProjectTimeline project={timelineProject} onOpen={onOpen} onAdd={onAdd} /><Location /></TooltipProvider>, route);
  return { onOpen, onAdd };
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
  const { onOpen } = show();
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
  // The fixture has no task in this window, so the empty state adds its own Hoje; the toolbar's comes first.
  await userEvent.click(screen.getAllByRole('button', { name: 'Hoje' })[0]);
  expect(screen.getByLabelText('url')).not.toHaveTextContent('anchor=');
});

it('shows an empty window inside the grid frame with a Hoje button that drops the anchor', async () => {
  const outside = { ...counts, totalTasks: 3 };
  show({ ...response, tasks: [], total: outside, visible: { ...counts, totalTasks: 0 } });
  const region = await screen.findByRole('region', { name: 'Timeline do projeto' });
  expect(within(region).getByText('Nenhuma tarefa neste período · 3 fora do período')).toBeInTheDocument();
  expect(screen.getByLabelText('url')).toHaveTextContent('anchor=2026-11-18');
  await userEvent.click(within(region).getByRole('button', { name: 'Hoje' }));
  expect(screen.getByLabelText('url')).not.toHaveTextContent('anchor=');
});

it('shows the empty window even when undated tasks fill "Sem data" below the grid', async () => {
  show({ ...response, tasks: [make(4, { title: 'Ideia solta', objectiveId: 81 })], total: { ...counts, totalTasks: 3 }, visible: { ...counts, totalTasks: 1 } });
  const undated = await screen.findByRole('region', { name: /Sem data/ });
  expect(within(undated).getByRole('button', { name: /Ideia solta/ })).toBeInTheDocument();
  const region = screen.getByRole('region', { name: 'Timeline do projeto' });
  expect(within(region).getByText('Nenhuma tarefa neste período · 2 fora do período')).toBeInTheDocument();
  expect(screen.queryByText('Nenhuma tarefa neste projeto')).not.toBeInTheDocument();
});

it('shows the empty project state without the grid and asks the page for a new task', async () => {
  const none = { totalTasks: 0, nonCancelledTasks: 0, completedTasks: 0, cancelledTasks: 0 };
  const { onAdd } = show({ ...response, tasks: [], total: none, visible: none });
  expect(await screen.findByText('Nenhuma tarefa neste projeto')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Timeline do projeto' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Nova tarefa' }));
  expect(onAdd).toHaveBeenCalledTimes(1);
});

it('tabs from the toolbar through each group and its bars, then "Sem data"; row labels never take focus', async () => {
  show();
  await screen.findByRole('region', { name: 'Timeline do projeto' });
  screen.getByRole('button', { name: 'Próximo período' }).focus();
  const order: string[] = [];
  for (let step = 0; step < 7; step++) {
    await userEvent.tab();
    const focused = document.activeElement as HTMLElement;
    expect(focused.closest('[aria-hidden="true"]')).toBeNull();
    order.push(focused.getAttribute('aria-label') ?? focused.textContent ?? '');
  }
  expect(order).toEqual([
    'Receber contatos pelo site, 2 de 6 tarefas concluídas, prazo 20 nov',
    'API de leitura, a fazer, planejada 16 nov, prazo 17 nov, atrasada',
    'Escrever testes, em andamento, planejada 19 nov, sem prazo',
    'Publicar, 0 de 0 tarefas concluídas',
    'Sem objetivo, 1 tarefa no período',
    'Revisar, a fazer, sem planejamento, prazo 24 nov',
    'Ideia soltaA fazer',
  ]);
});

it('hides the today line from assistive tech and announces today as text', async () => {
  show();
  const region = await screen.findByRole('region', { name: 'Timeline do projeto' });
  const line = region.querySelector('[data-timeline-today]');
  expect(line).toBeInTheDocument();
  expect(line?.closest('[aria-hidden="true"]')).not.toBeNull();
  expect(line).toHaveClass('w-0.5');
  const today = within(region).getByText('Hoje é 18 de novembro de 2026');
  expect(today).toHaveClass('sr-only');
  expect(today.closest('[aria-hidden="true"]')).toBeNull();
});

it('shows a grid-shaped skeleton (header and 6 rows) on the first load', () => {
  vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
  renderWork(<TooltipProvider><ProjectTimeline project={timelineProject} onOpen={vi.fn()} onAdd={vi.fn()} /></TooltipProvider>, '/projects/9');
  expect(screen.getByLabelText('Carregando timeline').children).toHaveLength(7);
  expect(screen.queryByRole('region', { name: 'Timeline do projeto' })).not.toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Atualizando a timeline' })).not.toBeInTheDocument();
});

it('keeps the previous data with a toolbar spinner while a new window loads', async () => {
  show();
  await screen.findByRole('button', { name: /^API de leitura/ });
  vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
  await userEvent.click(screen.getByRole('radio', { name: 'Semana' }));
  expect(await screen.findByRole('status', { name: 'Atualizando a timeline' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^API de leitura/ })).toBeInTheDocument();
  expect(screen.queryByLabelText('Carregando timeline')).not.toBeInTheDocument();
});

it('names completed and inverted bars; a completed task planned after its due date keeps the done look', async () => {
  show({ ...response, tasks: [
    make(6, { title: 'Publicar build', objectiveId: 81, plannedDate: '2026-11-10', dueDate: '2026-11-12', status: 'CONCLUDED' }),
    make(7, { title: 'Migrar dados', objectiveId: 81, plannedDate: '2026-11-27', dueDate: '2026-11-25' }),
    make(8, { title: 'Fechar release', objectiveId: 81, plannedDate: '2026-11-14', dueDate: '2026-11-11', status: 'CONCLUDED' }),
  ] });
  const done = await screen.findByRole('button', { name: 'Publicar build, concluída, planejada 10 nov, prazo 12 nov' });
  expect(within(done).getByText('Publicar build')).toHaveClass('line-through');
  const inverted = screen.getByRole('button', { name: 'Migrar dados, a fazer, planejada 27 nov, prazo 25 nov, planejada para depois do prazo' });
  expect(inverted).toHaveClass('text-negative');
  const doneInverted = screen.getByRole('button', { name: 'Fechar release, concluída, planejada 14 nov, prazo 11 nov, planejada para depois do prazo' });
  expect(doneInverted).toHaveClass('text-muted-foreground');
  expect(doneInverted).not.toHaveClass('text-negative');
});

it('puts the title inside a bar only when it spans enough days, and squares the clipped edge', async () => {
  show({ ...response, tasks: [
    // Pending, 2 days: below the 3 days the fortnight scale needs for an inner title.
    make(1, { title: 'API de leitura', objectiveId: 81, plannedDate: '2026-11-19', dueDate: '2026-11-20' }),
    make(9, { title: 'Refatorar', objectiveId: 81, plannedDate: '2026-10-01', dueDate: '2026-10-25', status: 'ON_DOING' }),
  ] });
  const short = await screen.findByRole('button', { name: /^API de leitura/ });
  expect(short).toBeEmptyDOMElement();
  // Without an inner title the outline is the only cue of the control: ≥3:1 (WCAG 1.4.11) in both themes.
  expect(short).toHaveClass('border-muted-foreground');
  // Thin, so a one-day bar never reads as a checkbox.
  expect(short).toHaveClass('h-4');
  const clipped = screen.getByRole('button', { name: /^Refatorar/ });
  expect(clipped).toHaveTextContent('Refatorar');
  expect(clipped).toHaveClass('h-7');
  // The title sticks beside the label column; overflow-clip keeps the timeline scroller as its scroll container.
  expect(within(clipped).getByText('Refatorar').closest('[data-timeline-title]')).toHaveClass('sticky', 'left-timeline-label');
  expect(clipped).toHaveClass('overflow-clip');
  expect(clipped).not.toHaveClass('overflow-hidden');
  expect(clipped).toHaveClass('rounded-l-none');
  expect(clipped).not.toHaveClass('rounded-r-none');
});

it('keeps open and done bars apart, each with a hover step (secondary, muted and accent share one tone)', async () => {
  show({ ...response, tasks: [
    make(1, { title: 'API de leitura', objectiveId: 81, plannedDate: '2026-11-19', dueDate: '2026-11-25' }),
    make(6, { title: 'Publicar build', objectiveId: 81, plannedDate: '2026-11-19', dueDate: '2026-11-25', status: 'CONCLUDED' }),
    make(7, { title: 'Corrigir', objectiveId: 81, plannedDate: '2026-11-10', dueDate: '2026-11-16' }),
  ] });
  expect(await screen.findByRole('button', { name: /^API de leitura/ })).toHaveClass('bg-card', 'hover:bg-muted');
  expect(screen.getByRole('button', { name: /^Publicar build/ })).toHaveClass('bg-muted', 'hover:bg-muted-foreground/15');
  expect(screen.getByRole('button', { name: /^Corrigir/ })).toHaveClass('bg-card', 'border-negative', 'hover:bg-muted');
});

it('scrolls a keyboard-focused bar clear of the sticky label column', async () => {
  const scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  show();
  const group = await screen.findByRole('button', { name: /^Receber contatos pelo site/ });
  group.focus();
  await userEvent.tab();
  const bar = screen.getByRole('button', { name: /^API de leitura/ });
  expect(bar).toHaveFocus();
  expect(bar).toHaveClass('scroll-ml-timeline-label');
  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  expect(scrollIntoView.mock.contexts.at(-1)).toBe(bar);
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

it('collapses and reopens an objective group from the keyboard', async () => {
  show();
  const group = await screen.findByRole('button', { name: /^Receber contatos pelo site/ });
  group.focus();
  await userEvent.keyboard('{Enter}');
  expect(group).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: /^API de leitura/ })).not.toBeInTheDocument();
  await userEvent.keyboard(' ');
  expect(group).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: /^API de leitura/ })).toBeInTheDocument();
});

it('offers a retry when the board fails to load', async () => {
  vi.mocked(api.get).mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  renderWork(<TooltipProvider><ProjectTimeline project={timelineProject} onOpen={vi.fn()} onAdd={vi.fn()} /></TooltipProvider>, '/projects/9');
  expect(await screen.findByRole('alert')).toHaveTextContent('Recurso indisponível ou sem acesso.');
  expect(screen.getByRole('button', { name: 'Recarregar dados' })).toBeInTheDocument();
});
