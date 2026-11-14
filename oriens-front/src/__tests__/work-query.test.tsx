import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { refreshTask, taskAffectsKey, useTaskDay, workKey } from '@/hooks/useWork';
import { assertWorkIdentity } from '@/lib/work-identity';
import { productNow } from '@/lib/product-time';
import { taskService } from '@/services/taskService';
import type { DayResponse, TaskMutation } from '@/types/work';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/taskService', () => ({ taskService: { day: vi.fn() } }));
const result = { task: { id: 42 }, affectedProjectIds: [9], previousPlannedDate: '2026-11-12', plannedDate: '2026-11-20' } as TaskMutation;

describe('P3 work queries', () => {
  it('rejects unsafe identity and version numbers at the transport boundary', () => {
    expect(() => assertWorkIdentity({ task: { id: Number.MAX_SAFE_INTEGER + 1, version: 0 } })).toThrow();
    expect(() => assertWorkIdentity({ projectVersion: -1 })).toThrow();
    expect(() => assertWorkIdentity({ affectedProjectIds: [1, 2.5] })).toThrow();
    expect(() => assertWorkIdentity({ task: { id: 1, version: 0, projectId: null } })).not.toThrow();
  });
  it('uses Recife at the UTC day boundary', () => {
    expect(productNow(new Date('2026-11-14T02:59:59Z'))).toEqual({ date: '2026-11-13', time: '23:59:59' });
    expect(productNow(new Date('2026-11-14T03:00:00Z')).date).toBe('2026-11-14');
  });
  it('invalidates old/new dates, matching weeks, today recovery and linked projects only', () => {
    const matches = (family: string, ...params: unknown[]) => taskAffectsKey(workKey(7, family, ...params), 7, result, '2026-11-14');
    expect(matches('tasks/day', '2026-11-12')).toBe(true);
    expect(matches('tasks/day', '2026-11-14')).toBe(true);
    expect(matches('tasks/day', '2026-11-21')).toBe(false);
    expect(matches('tasks/week', '2026-11-15', '2026-11-21')).toBe(true);
    expect(matches('tasks/week', '2026-12-01', '2026-12-07')).toBe(false);
    expect(matches('projects/board', 9)).toBe(true);
    expect(matches('projects/board', 10)).toBe(false);
    expect(taskAffectsKey(workKey(8, 'tasks/all'), 7, result, '2026-11-14')).toBe(false);
  });
  it('keeps write confirmation separate when refetch fails', async () => {
    const client = new QueryClient();
    vi.spyOn(client, 'invalidateQueries').mockRejectedValue(new Error('Offline'));
    expect(await refreshTask(client, 7, result)).toEqual({ saved: true, refreshFailed: true });
    expect(client.getQueryData(workKey(7, 'tasks/detail', 42))).toEqual(result.task);
  });
  it('does not display a late day response under the next day', async () => {
    let oldResolve: (data: DayResponse) => void;
    vi.mocked(taskService.day).mockImplementation((_user, date) =>
      date === '2026-11-12' ? new Promise(resolve => { oldResolve = resolve; }) :
        Promise.resolve({ date, planned: [], completed: [], previousPlans: [], deadlineAttention: [], timezone: 'America/Recife' }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(({ date }) => useTaskDay(date), { initialProps: { date: '2026-11-12' }, wrapper });
    hook.rerender({ date: '2026-11-13' });
    await waitFor(() => expect(hook.result.current.data?.date).toBe('2026-11-13'));
    oldResolve!({ date: '2026-11-12' } as DayResponse);
    await waitFor(() => expect(hook.result.current.data?.date).toBe('2026-11-13'));
  });
});
