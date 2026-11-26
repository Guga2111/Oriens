import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { workKey } from './useWork';
import { useProductToday } from './useProductToday';
import { statisticsService } from '@/services/statisticsService';
import { getAllEntries } from '@/services/financialService';
import type { HabitCommand, Interval } from '@/types/statistics';

export function useActivityStreak() {
  const { userId } = useAuth(), today = useProductToday();
  return useQuery({ queryKey: workKey(userId, 'statistics', 'streak', today), enabled: userId !== null,
    queryFn: ({ signal }) => statisticsService.streak(userId!, signal) });
}
export function useActivity(period: Interval, enabled = true) {
  const { userId } = useAuth(), today = useProductToday();
  return useQuery({ queryKey: workKey(userId, 'statistics', 'activity', period, today), enabled: userId !== null && enabled,
    queryFn: ({ signal }) => statisticsService.activity(userId!, period, signal) });
}
export function usePlanning(period: Interval) {
  const { userId } = useAuth(), today = useProductToday();
  return useQuery({ queryKey: workKey(userId, 'statistics', 'planning', period, today), enabled: userId !== null,
    queryFn: ({ signal }) => statisticsService.planning(userId!, period, signal) });
}
export function useHabitStatistics(period: Interval, enabled = true) {
  const { userId } = useAuth(), today = useProductToday();
  return useQuery({ queryKey: workKey(userId, 'statistics', 'habits', period, today), enabled: userId !== null && enabled,
    queryFn: ({ signal }) => statisticsService.habits(userId!, period, signal) });
}
export function useFinanceStatistics(period: Interval) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'statistics', 'finance', period), enabled: userId !== null,
    queryFn: ({ signal }) => statisticsService.finance(userId!, period, signal) });
}
export function useTaskEvidence(period: Interval, kind: string, page: number, enabled: boolean, projectId?: number, unassigned = false) {
  const { userId } = useAuth(), today = useProductToday();
  return useQuery({ queryKey: workKey(userId, 'statistics', 'task-evidence', period, kind, page, projectId, unassigned, today), enabled: userId !== null && enabled,
    queryFn: ({ signal }) => statisticsService.tasks(userId!, period, kind, page, projectId, unassigned, signal) });
}
export function useFinancialEvidence(period: Interval, page: number, enabled: boolean, tagId?: number) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'statistics', 'financial-evidence', period, page, tagId), enabled: userId !== null && enabled,
    queryFn: ({ signal }) => getAllEntries(userId!, { ...period, page, size: 20, tagId, sortBy: 'entryDate', direction: 'DESC' }, signal) });
}
export function useHabitWrites() {
  const { userId } = useAuth(), client = useQueryClient();
  return useMutation({ retry: false, mutationFn: async (command: HabitCommand) => {
    if (userId === null) throw new Error('Entre novamente para continuar.');
    const habit = await statisticsService.writeHabit(userId, command);
    // Writes are confirmed independently of a failed refresh. Never repeat creation to refresh.
    try {
      await Promise.all(['habits', 'streak'].map(domain => client.invalidateQueries({ queryKey: workKey(userId, 'statistics', domain) }, { throwOnError: true })));
      return { habit, refreshFailed: false };
    } catch { return { habit, refreshFailed: true }; }
  } });
}
