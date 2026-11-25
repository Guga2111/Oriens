import { screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { DashboardPage } from '@/pages/DashboardPage';
import { DayLine } from '@/components/dashboard/DayLine';
import { useProductToday } from '@/hooks/useProductToday';
import { renderHook } from '@testing-library/react';
import api from '@/services/api';
import { renderWork, task } from './work-fixtures';
import { productNow } from '@/lib/product-time';
import type { DayResponse, TaskPatch } from '@/types/work';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/hooks/useSound', () => ({ useSound: () => vi.fn() }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
afterEach(() => vi.useRealTimers());
const emptyDay = (date: string): DayResponse => ({ date, timezone: 'America/Recife', planned: [], completed: [], previousPlans: [], deadlineAttention: [] });

it('renderiza as partições autorizadas, contexto arquivado, prazo único e sem horário fora da timeline', async () => {
  const today = productNow().date;
  vi.mocked(api.get).mockImplementation(async (_url, config) => ({ data: { ...emptyDay(config.params.date),
    planned: [{ ...task, title: 'Sem hora', plannedDate: today, dueDate: '2000-01-01', project: { ...task.project!, archived: true } }],
    previousPlans: [{ ...task, id: 2, title: 'Plano anterior', plannedDate: '2000-01-01' }],
    deadlineAttention: [{ ...task, id: 3, title: 'Prazo com plano futuro', plannedDate: '2099-01-01', dueDate: today }],
    completed: [{ ...task, id: 4, title: 'Feita', status: 'CONCLUDED', plannedDate: today, startTime: '10:00:00' }],
  } }));
  renderWork(<DashboardPage />);
  const row = (await screen.findByText('Sem hora')).closest('li')!;
  expect(within(row).getByText(/Projeto arquivado/)).toBeInTheDocument();
  expect(within(row).getByRole('link', { name: 'Site pessoal' })).toHaveAttribute('href', '/tasks/project/9');
  expect(within(row).getByRole('button', { name: /Prazo ultrapassado/ })).toBeInTheDocument();
  expect(screen.getAllByText('Sem hora')).toHaveLength(1);
  expect(screen.getByText('Plano anterior')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Planejada para 01/01/2099' })).toHaveTextContent('01/01/2099');
  // A plan for today reads as "Hoje" and stays editable from the row.
  expect(within(row).getByRole('button', { name: 'Planejada para hoje' })).toHaveTextContent('Hoje');
  expect(screen.getByRole('button', { name: /Prazo termina hoje/ })).toBeInTheDocument();
  expect(within(screen.getByRole('list', { name: 'Linha do dia' })).getByRole('button', { name: /Feita/ })).toBeInTheDocument();
  expect(await screen.findByText('Feita')).toBeInTheDocument();
  expect(within(screen.getByRole('list', { name: 'Linha do dia' })).getByRole('button', { name: /Feita/ })).toBeInTheDocument();
});

it.each([['Fazer hoje', true], ['Retirar do planejamento', false]] as const)('%s usa PATCH mínimo sem mudar prazo, estado ou vínculos e invalida quadro/dias', async (label, today) => {
  let current = { ...task, plannedDate: '2000-01-01', startTime: '09:00:00', dueDate: '2099-01-01' };
  vi.mocked(api.get).mockImplementation(async (_url, config) => ({ data: { ...emptyDay(config.params.date), previousPlans: current.plannedDate === '2000-01-01' ? [current] : [], planned: current.plannedDate === config.params.date ? [current] : [] } }));
  vi.mocked(api.patch).mockImplementation(async (_url, body) => {
    const previousPlannedDate = current.plannedDate;
    current = { ...current, ...(body as TaskPatch), version: current.version + 1 };
    return { data: { task: current, previousPlannedDate, plannedDate: current.plannedDate, affectedProjectIds: [9] } };
  });
  const { client } = renderWork(<DashboardPage />);
  client.setQueryData(['work', 7, 'projects/board', 9, {}], {});
  await userEvent.click(await screen.findByRole('button', { name: `Ações da tarefa ${task.title}` }));
  await userEvent.click(await screen.findByRole('menuitem', { name: label }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/task/42', { version: 2, projectVersion: 4, plannedDate: today ? productNow().date : null, startTime: null }));
  await waitFor(() => expect(client.getQueryState(['work', 7, 'projects/board', 9, {}])?.isInvalidated).toBe(true));
  expect(current.dueDate).toBe('2099-01-01');
});

it('dias navegados não mostram recuperação; mantém escopo de data e semana na URL', async () => {
  vi.mocked(api.get).mockImplementation(async (url, config) => ({ data: url.endsWith('/range') ? { tasks: [], startDate: config.params.startDate, endDate: config.params.endDate } : emptyDay(config.params.date) }));
  renderWork(<DashboardPage />, '/tasks?date=2026-10-25&view=week');
  expect(await screen.findByText(/Semana de 25 de outubro a 31 de outubro/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: 'Ver dia' }));
  expect(screen.queryByRole('heading', { name: 'Pendentes de dias anteriores' })).not.toBeInTheDocument();
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/task/user/7', expect.objectContaining({ params: { date: '2026-10-25' } })));
});

it('agrupa marcas coincidentes e foca qualquer tarefa pelo menu de teclado', async () => {
  renderWork(<><DayLine tasks={[{ ...task, startTime: '09:00:00' }, { ...task, id: 43, title: 'Segunda', startTime: '09:00:59' }]} date={new Date()} /><div id="task-row-43" tabIndex={-1} /></>);
  const marker = screen.getByRole('button', { name: '09:00, 2 tarefas' });
  act(() => marker.focus()); await userEvent.keyboard('{Enter}');
  const item = await screen.findByRole('menuitem', { name: /Segunda/ });
  act(() => item.focus()); await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(document.activeElement).toHaveAttribute('id', 'task-row-43'));
});

it('vira Hoje no instante da meia-noite em Recife', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T02:59:59Z'));
  const { result } = renderHook(() => useProductToday());
  expect(result.current).toBe('2026-11-13');
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe('2026-11-14');
});

it('busca localmente nas partições do dia e limpa o filtro sem novas requisições', async () => {
  const today = productNow().date;
  vi.mocked(api.get).mockImplementation(async url => ({ data: url.includes('label') ? [] : { ...emptyDay(today),
    planned: [{ ...task, title: 'Preparar entrega', plannedDate: today }],
    previousPlans: [{ ...task, id: 2, title: 'Revisar orçamento', plannedDate: '2000-01-01' }],
    deadlineAttention: [{ ...task, id: 3, title: 'Enviar orçamento', dueDate: today }],
  } }));
  renderWork(<DashboardPage />, '/tasks');
  await screen.findByText('Preparar entrega');
  await userEvent.click(screen.getByRole('button', { name: 'Buscar tarefas' }));
  const input = screen.getByRole('searchbox', { name: 'Buscar nas tarefas carregadas' });
  expect(input).toHaveFocus();
  const taskRequests = () => vi.mocked(api.get).mock.calls.filter(([url]) => url.startsWith('/task/')).length;
  const requestCount = taskRequests();
  await userEvent.type(input, 'ORÇAMENTO');
  expect(screen.queryByText('Preparar entrega')).not.toBeInTheDocument();
  expect(screen.getByText('Revisar orçamento')).toBeInTheDocument();
  expect(screen.getByText('Enviar orçamento')).toBeInTheDocument();
  await userEvent.clear(input);
  await userEvent.type(input, 'inexistente');
  expect(screen.getByText('Nenhuma tarefa encontrada')).toBeInTheDocument();
  await userEvent.click(within(screen.getByRole('search')).getByRole('button', { name: 'Limpar busca' }));
  expect(screen.getByText('Preparar entrega')).toBeInTheDocument();
  expect(taskRequests()).toBe(requestCount);
});

it('filtra também a visão semanal sem buscar no servidor', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { tasks: [
    { ...task, title: 'Revisar documento', plannedDate: '2026-10-26' },
    { ...task, id: 2, title: 'Outra tarefa', plannedDate: '2026-10-27' },
  ] } });
  renderWork(<DashboardPage />, '/tasks?date=2026-10-25&view=week');
  await screen.findByText('Outra tarefa');
  const taskRequests = () => vi.mocked(api.get).mock.calls.filter(([url]) => url.startsWith('/task/')).length;
  const requestCount = taskRequests();
  await userEvent.click(screen.getByRole('button', { name: 'Buscar tarefas' }));
  await userEvent.type(screen.getByRole('searchbox'), 'Revisar');
  expect(screen.getByText('Revisar documento')).toBeInTheDocument();
  expect(screen.queryByText('Outra tarefa')).not.toBeInTheDocument();
  expect(taskRequests()).toBe(requestCount);
});
