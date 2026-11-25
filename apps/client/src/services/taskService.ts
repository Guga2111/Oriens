import api from './api';
import type { Priority, Status } from '@/types/task';
import type { Page } from '@/types/financial';
import type { DayResponse, RangeResponse, WorkTask, PlanningCount, TaskPatch, TaskCreation,
  TaskMutation, TaskDeletion, WeeklyResponse } from '@/types/work';

export interface TaskFilters {
  projectId?: number;
  dateField?: 'plannedDate' | 'dueDate';
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
  status?: Status;
  priority?: Priority;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const taskService = {
  day: async (user: number, date: string, signal?: AbortSignal) =>
    (await api.get<DayResponse>(`/task/user/${user}`, { params: { date }, signal })).data,
  week: async (user: number, startDate: string, endDate: string, signal?: AbortSignal) =>
    (await api.get<RangeResponse>(`/task/user/${user}/range`, { params: { startDate, endDate }, signal })).data,
  all: async (user: number, params: TaskFilters, signal?: AbortSignal) =>
    (await api.get<Page<WorkTask>>(`/task/user/${user}/all`, { params, signal })).data,
  task: async (id: number, signal?: AbortSignal) => (await api.get<WorkTask>(`/task/${id}`, { signal })).data,
  count: async (user: number, date: string, excludeTaskId?: number, signal?: AbortSignal) =>
    (await api.get<PlanningCount>(`/task/user/${user}/planning-count`, { params: { date, excludeTaskId }, signal })).data,
  patchTask: async (id: number, body: TaskPatch) => (await api.patch<TaskMutation>(`/task/${id}`, body)).data,
  createTask: async (user: number, body: TaskCreation, key: string) =>
    (await api.post<TaskMutation>(`/task/user/${user}`, body, { headers: { 'Idempotency-Key': key } })).data,
  deleteTask: async (task: WorkTask) => (await api.delete<TaskDeletion>(`/task/${task.id}`, {
    headers: { 'If-Match': `"${task.version}"`, ...(task.project && { 'X-Project-Version': task.project.version }) },
  })).data,
  weeklySummary: async (user: number, startDate: string, endDate: string, signal?: AbortSignal) =>
    (await api.get<WeeklyResponse>(`/task/user/${user}/summary/weekly-counts`, { params: { startDate, endDate }, signal })).data,
};
