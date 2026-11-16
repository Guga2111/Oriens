import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ActivityCalendar } from '@/components/statistics/ActivityCalendar';
import { QueryContent } from '@/components/statistics/AnalysisPrimitives';
import { StatisticsPeriodPicker } from '@/components/statistics/StatisticsPeriodPicker';
import { useHabitWrites } from '@/hooks/useStatistics';
import { statisticsService } from '@/services/statisticsService';
import { taskAffectsKey, workKey } from '@/hooks/useWork';
import type { ActivityData, HabitCommand, HabitsData } from '@/types/statistics';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/statisticsService', () => ({ statisticsService: { writeHabit: vi.fn() } }));
const query = <T,>(data: T, overrides = {}) => ({ data, isPending: false, isError: false, isFetching: false, dataUpdatedAt: Date.now(), refetch: vi.fn(), ...overrides }) as unknown as UseQueryResult<T, Error>;

describe('estatísticas — interação e consistência de cache', () => {
  it('começa uma nova faixa ao escolher o início e só aplica depois de escolher o fim', () => {
    const changed = vi.fn();
    render(<StatisticsPeriodPicker value={{ startDate: '2026-10-17', endDate: '2026-11-15' }} today="2026-11-15" mode="30" onModeChange={vi.fn()} onChange={changed} />);
    fireEvent.click(screen.getByRole('button', { name: /Escolher intervalo:/ }));
    fireEvent.click(screen.getByRole('gridcell', { name: '20' }));
    expect(screen.getByRole('button', { name: 'Aplicar período' })).toBeDisabled();
    expect(changed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('gridcell', { name: '25' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar período' }));
    expect(changed).toHaveBeenCalledWith({ startDate: '2026-10-20', endDate: '2026-10-25' });
  });
  it('percorre semanas e dias com um único tab stop e mantém contagens decompostas', () => {
    const onSelect = vi.fn();
    const period = { startDate: '2026-11-01', endDate: '2026-11-15' };
    const tasks = { coverageFrom: '2026-11-10', days: [{ date: '2026-11-15', completed: 2 }] } as ActivityData;
    const habits = { coverageFrom: '2026-11-10', days: [{ date: '2026-11-15', completed: 1 }] } as HabitsData;
    const { container } = render(<TooltipProvider><ActivityCalendar period={period} today={period.endDate} tasks={query(tasks)} habits={query(habits)} onSelect={onSelect} onWindowChange={vi.fn()} /></TooltipProvider>);
    expect(container.querySelectorAll('button[role="gridcell"][tabindex="0"]')).toHaveLength(1);
    const cell = container.querySelector('button[role="gridcell"][tabindex="0"]') as HTMLButtonElement;
    expect(cell).toHaveAttribute('aria-label', expect.stringContaining('2 tarefas concluídas. 1 execuções de hábitos. 3 realizações'));
    act(() => cell.focus()); fireEvent.keyDown(cell, { key: 'ArrowLeft' });
    expect(document.activeElement).toHaveAttribute('aria-label', expect.stringContaining('8 de novembro'));
    expect(onSelect).not.toHaveBeenCalled(); fireEvent.click(document.activeElement!);
    expect(onSelect).toHaveBeenCalledWith('2026-11-08', expect.any(HTMLButtonElement));
    expect(container.querySelectorAll('button[role="gridcell"][tabindex="0"]')).toHaveLength(1);
  });
  it('mantém valores válidos quando o refresh falha e oferece uma nova tentativa', () => {
    const retry = vi.fn();
    render(<QueryContent query={query({ value: 12 }, { isError: true, refetch: retry })}>{data => <p>{data.value} conclusões</p>}</QueryContent>);
    expect(screen.getByText('12 conclusões')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Mantendo os dados');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); expect(retry).toHaveBeenCalledOnce();
  });
  it('nova consulta sem dados mostra carregamento em vez de converter ausência em zero', () => {
    render(<QueryContent query={query<{ value: number }>(undefined!, { isPending: true })} label="tarefas">{data => <p>{data.value} conclusões</p>}</QueryContent>);
    expect(screen.getByRole('status')).toHaveAccessibleName('Carregando tarefas');
    expect(screen.queryByText('0 conclusões')).not.toBeInTheDocument();
  });
  it('mutações de tarefa invalidam suas análises, sem atualizar domínios independentes ou outra conta', () => {
    const result = { id: 1, previousPlannedDate: '2026-11-15', affectedProjectIds: [] };
    expect(taskAffectsKey(workKey(7, 'statistics', 'activity'), 7, result, '2026-11-15')).toBe(true);
    expect(taskAffectsKey(workKey(7, 'statistics', 'streak', '2026-11-15'), 7, result, '2026-11-15')).toBe(true);
    expect(taskAffectsKey(workKey(8, 'statistics', 'streak', '2026-11-15'), 7, result, '2026-11-15')).toBe(false);
    expect(taskAffectsKey(workKey(7, 'statistics', 'task-evidence'), 7, result, '2026-11-15')).toBe(true);
    expect(taskAffectsKey(workKey(7, 'statistics', 'finance'), 7, result, '2026-11-15')).toBe(false);
    expect(taskAffectsKey(workKey(7, 'statistics', 'habits'), 7, result, '2026-11-15')).toBe(false);
    expect(taskAffectsKey(workKey(8, 'statistics', 'activity'), 7, result, '2026-11-15')).toBe(false);
  });
  it('escrita confirmada com refetch falho não é repetida nem reportada como falha de salvamento', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(client, 'invalidateQueries').mockRejectedValue(new Error('offline'));
    vi.mocked(statisticsService.writeHabit).mockResolvedValue({ id: 3, version: 1 } as never);
    let write: ReturnType<typeof useHabitWrites>;
    function Harness() { write = useHabitWrites(); return null; }
    render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
    const command: HabitCommand = { action: 'create', key: 'synthetic-key', input: { name: 'Ler', weekdays: [1], startDate: '2026-11-15', endDate: null } };
    let result: Awaited<ReturnType<typeof write.mutateAsync>>;
    await act(async () => { result = await write.mutateAsync(command); });
    expect(result!.refreshFailed).toBe(true); expect(statisticsService.writeHabit).toHaveBeenCalledTimes(1);
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: workKey(7, 'statistics', 'habits') }, { throwOnError: true });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: workKey(7, 'statistics', 'streak') }, { throwOnError: true });
  });
});
