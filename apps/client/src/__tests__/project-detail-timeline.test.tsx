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
vi.mock('@/context/SettingsContext', () => ({
  useSettings: () => ({ preferences: { notifications: true, sound: false, theme: 'light', taskView: 'peek' }, updatePreference: vi.fn() }),
}));
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

// The page's header actions render in place here: the shell's header slot is not mounted.
const viewIs = (name: string, hidden = false) => expect(screen.getByRole('radio', { name, hidden })).toHaveAttribute('aria-checked', 'true');

it('?tab=timeline shows the timeline as the work items view, without tabs or board filters', async () => {
  show('/tasks/project/9?tab=timeline');
  expect(await screen.findByRole('region', { name: 'Timeline do projeto' })).toBeInTheDocument();
  viewIs('Timeline');
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Filtros do quadro/ })).not.toBeInTheDocument();
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
  const panel = await screen.findByRole('dialog', { name: scheduled.title });
  expect(within(panel).getByRole('button', { name: `Ações da tarefa ${scheduled.title}` })).toBeInTheDocument();
  // The side panel leaves the page usable behind it.
  viewIs('Timeline');
});

it('"Nova tarefa" in the empty timeline opens the page TaskEditor', async () => {
  const none = { totalTasks: 0, nonCancelledTasks: 0, completedTasks: 0, cancelledTasks: 0 };
  serve(project, { ...windowed, tasks: [], total: none, visible: none });
  show('/tasks/project/9?tab=timeline');
  const empty = (await screen.findByText('Nenhuma tarefa neste projeto')).closest<HTMLElement>('[data-slot="empty"]')!;
  await userEvent.click(within(empty).getByRole('button', { name: 'Nova tarefa' }));
  expect(await screen.findByRole('dialog', { name: 'Nova tarefa' })).toBeInTheDocument();
});

it('an unknown ?tab falls back to the board', async () => {
  show('/tasks/project/9?tab=gantt');
  expect(await screen.findByRole('region', { name: 'Quadro do projeto' })).toBeInTheDocument();
  viewIs('Quadro');
  expect(screen.queryByRole('region', { name: 'Timeline do projeto' })).not.toBeInTheDocument();
});

it('a SIMPLE project has no work item views', async () => {
  serve({ ...project, mode: 'SIMPLE' });
  show('/tasks/project/9?tab=timeline');
  expect(await screen.findByRole('heading', { name: project.title })).toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Visão dos itens de trabalho' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Timeline do projeto' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ações do projeto' })).toBeInTheDocument();
});

it('?tab=overview shows the project summary, without work item views', async () => {
  show('/tasks/project/9?tab=overview');
  const summary = await screen.findByRole('complementary', { name: 'Informações do projeto' });
  expect(within(summary).getByRole('heading', { name: 'Resumo' })).toBeInTheDocument();
  expect(within(summary).queryByRole('button', { name: 'Usar quadro de tarefas' })).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Visão dos itens de trabalho' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Nova tarefa' }).length).toBeGreaterThan(0);
});

it.each([['Lista', 'list'], ['Calendário', 'calendar'], ['Tabela', 'table']])('a visão %s ainda não existe: avisa "em breve" e volta ao quadro', async (label, tab) => {
  show('/tasks/project/9?tab=board');
  await screen.findByRole('region', { name: 'Quadro do projeto' });
  await userEvent.click(screen.getByRole('radio', { name: `${label} (em breve)` }));
  expect(screen.getByLabelText('url')).toHaveTextContent(`tab=${tab}`);
  const soon = screen.getByRole('region', { name: `Visão ${label}` });
  expect(within(soon).getByText(`${label} em breve`)).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Quadro do projeto' })).not.toBeInTheDocument();
  await userEvent.click(within(soon).getByRole('button', { name: 'Abrir quadro' }));
  expect(screen.getByLabelText('url')).toHaveTextContent('tab=board');
  expect(await screen.findByRole('region', { name: 'Quadro do projeto' })).toBeInTheDocument();
});

it('os filtros do quadro ficam no botão de filtro e vão para a URL', async () => {
  show('/tasks/project/9?tab=board');
  await screen.findByRole('region', { name: 'Quadro do projeto' });
  await userEvent.click(screen.getByRole('button', { name: 'Filtros do quadro' }));
  await userEvent.click(screen.getByRole('button', { name: 'Opções do quadro' }));
  await userEvent.click(await screen.findByRole('checkbox', { name: 'Somente abertas' }));
  expect(screen.getByLabelText('url')).toHaveTextContent('open=1');
  expect(screen.getByRole('button', { name: 'Filtros do quadro (1 ativo)' })).toBeInTheDocument();
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Filtros do quadro' })).getByRole('button', { name: 'Limpar filtros' }));
  expect(screen.getByLabelText('url')).not.toHaveTextContent('open=1');
});

it('o breadcrumb nomeia o projeto: título e descrição saem da página e o h1 fica para leitores de tela', async () => {
  serve({ ...project, description: 'Portfólio e blog pessoal' });
  show('/tasks/project/9?tab=board');
  await screen.findByRole('region', { name: 'Quadro do projeto' });
  expect(screen.getByRole('heading', { level: 1, name: project.title })).toHaveClass('sr-only');
  expect(screen.queryByText('Portfólio e blog pessoal')).not.toBeInTheDocument();
});

it('cada coluna do quadro mostra o ícone do seu estado, o nome sem negrito e a contagem', async () => {
  show('/tasks/project/9?tab=board');
  const board = await screen.findByRole('region', { name: 'Quadro do projeto' });
  await within(board).findByRole('region', { name: 'A fazer' });
  for (const [name, kind, count] of [['A fazer', 'A fazer', '1'], ['Fazendo', 'Em andamento', '0'], ['Concluídas', 'Concluída', '0']]) {
    const column = within(board).getByRole('region', { name });
    expect(within(column).getByRole('img', { name: kind })).toBeInTheDocument();
    expect(within(column).getByRole('heading', { name })).toHaveClass('font-normal');
    expect(within(column).getByText(count, { selector: 'span' })).toBeInTheDocument();
  }
});

it('a coluna Backlog tem o ícone tracejado, separado de A fazer', async () => {
  const withBacklog = { ...board, columns: [{ ...board.columns[0], id: 10, name: 'Backlog', kind: 'BACKLOG' as const, position: 0, totalCount: 0, visibleCount: 0 }, ...board.columns] };
  vi.mocked(api.get).mockImplementation(async (url, config?: { params?: { startDate?: string } }) => {
    const path = String(url);
    if (path.startsWith('/task-labels/')) return { data: [] };
    if (path.endsWith('/board')) return { data: config?.params?.startDate ? windowed : withBacklog };
    if (path.includes('/project/user/')) return { data: pageOf([project]) };
    return { data: project };
  });
  show('/tasks/project/9?tab=board');
  const column = await screen.findByRole('region', { name: 'Backlog' });
  const icon = within(column).getByRole('img', { name: 'Backlog' });
  expect(icon).toHaveClass('lucide-circle-dashed');
  expect(within(await screen.findByRole('region', { name: 'A fazer' })).getByRole('img', { name: 'A fazer' })).not.toHaveClass('lucide-circle-dashed');
});

it('a visão escolhida fica marcada no próprio item, e o tooltip abre pelo teclado', async () => {
  show('/tasks/project/9?tab=board');
  await screen.findByRole('region', { name: 'Quadro do projeto' });
  const board = screen.getByRole('radio', { name: 'Quadro' });
  expect(board).toHaveAttribute('data-state', 'on');
  expect(screen.getByRole('radio', { name: 'Timeline' })).toHaveAttribute('data-state', 'off');
  screen.getByRole('radio', { name: 'Calendário (em breve)' }).focus();
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Calendário · em breve');
});

it('guarda a visão dos objetivos na URL e volta à lista sem parâmetro', async () => {
  show('/tasks/project/9?tab=objectives');
  const views = await screen.findByRole('group', { name: 'Visão dos objetivos' });
  await userEvent.click(within(views).getByRole('radio', { name: 'Galeria' }));
  expect(screen.getByRole('status', { name: 'url' })).toHaveTextContent('layout=gallery');
  expect(screen.getByRole('list', { name: 'Galeria de objetivos' })).toBeInTheDocument();
  await userEvent.click(within(views).getByRole('radio', { name: 'Timeline' }));
  expect(screen.getByRole('region', { name: 'Timeline dos objetivos' })).toBeInTheDocument();
  await userEvent.click(within(views).getByRole('radio', { name: 'Lista' }));
  expect(screen.getByRole('status', { name: 'url' })).not.toHaveTextContent('layout=');
  expect(screen.getByRole('list', { name: 'Lista de objetivos' })).toBeInTheDocument();
});

it('mostra as ações do projeto em Panorama e Itens de trabalho, mas não em Objetivos', async () => {
  const first = show('/tasks/project/9?tab=objectives');
  await screen.findByRole('group', { name: 'Visão dos objetivos' });
  expect(screen.queryByRole('button', { name: 'Ações do projeto' })).not.toBeInTheDocument();
  first.unmount();
  const second = show('/tasks/project/9?tab=overview');
  expect(await screen.findByRole('button', { name: 'Ações do projeto' })).toBeInTheDocument();
  second.unmount();
  show('/tasks/project/9?tab=board');
  expect(await screen.findByRole('button', { name: 'Ações do projeto' })).toBeInTheDocument();
});
