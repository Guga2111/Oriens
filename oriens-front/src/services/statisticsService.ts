import api from './api';
import type { ActivityData, ActivityStreakData, FinanceData, HabitsData, Habit, HabitCommand, Interval, PlanningData, TaskEvidencePage } from '@/types/statistics';

export const statisticsService = {
  streak: async (user: number, signal?: AbortSignal) => (await api.get<ActivityStreakData>(`/statistics/user/${user}/streak`, { signal })).data,
  activity: async (user: number, period: Interval, signal?: AbortSignal) => (await api.get<ActivityData>(`/statistics/user/${user}/activity`, { params: period, signal })).data,
  planning: async (user: number, period: Interval, signal?: AbortSignal) => (await api.get<PlanningData>(`/statistics/user/${user}/planning`, { params: period, signal })).data,
  finance: async (user: number, period: Interval, signal?: AbortSignal) => (await api.get<FinanceData>(`/statistics/user/${user}/finance`, { params: period, signal })).data,
  habits: async (user: number, period: Interval, signal?: AbortSignal) => (await api.get<HabitsData>(`/habits/user/${user}`, { params: period, signal })).data,
  tasks: async (user: number, period: Interval, kind: string, page: number, projectId?: number, unassigned = false, signal?: AbortSignal) =>
    (await api.get<TaskEvidencePage>(`/statistics/user/${user}/tasks`, { params: { ...period, kind, page, size: 20, projectId, unassigned }, signal })).data,
  writeHabit: async (user: number, command: HabitCommand): Promise<Habit> => {
    const base = `/habits/user/${user}`;
    if (command.action === 'create') return (await api.post<Habit>(base, command.input, { headers: { 'Idempotency-Key': command.key } })).data;
    const path = `${base}/${command.habit.id}`, version = command.habit.version;
    if (command.action === 'update') return (await api.put<Habit>(path, { version, name: command.name, weekdays: command.weekdays })).data;
    if (command.action === 'execution') return (await api.put<Habit>(`${path}/executions/${command.date}`, { version, completed: command.completed })).data;
    if (command.action === 'pause') return (await api.post<Habit>(`${path}/pauses`, { version, startDate: command.startDate, endDate: command.endDate })).data;
    return (await api.post<Habit>(`${path}/archive`, { version })).data;
  },
};
