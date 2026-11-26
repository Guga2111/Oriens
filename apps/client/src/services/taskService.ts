import api from './api';
import type { TaskFilterQuery } from '@/lib/task-filters';
import type { Page } from '@/types/financial';
import type { DayResponse, RangeResponse, WorkTask, PlanningCount, TaskPatch, TaskCreation,
  TaskMutation, TaskDeletion, WeeklyResponse } from '@/types/work';

export interface TaskListQuery extends TaskFilterQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
}

export type TaskMediaKind = 'image' | 'video';
export interface TaskAttachment { id: string; kind: TaskMediaKind; contentType: string }
export interface TaskAttachmentLink { id: string; contentType: string; expiresAt: string; url: string }

export const taskService = {
  day: async (user: number, date: string, signal?: AbortSignal) =>
    (await api.get<DayResponse>(`/task/user/${user}`, { params: { date }, signal })).data,
  week: async (user: number, startDate: string, endDate: string, signal?: AbortSignal) =>
    (await api.get<RangeResponse>(`/task/user/${user}/range`, { params: { startDate, endDate }, signal })).data,
  all: async (user: number, params: TaskListQuery, signal?: AbortSignal) =>
    (await api.get<Page<WorkTask>>(`/task/user/${user}/all`, { params, signal })).data,
  task: async (id: number, signal?: AbortSignal) => (await api.get<WorkTask>(`/task/${id}`, { signal })).data,
  uploadAttachment: async (id: number, kind: TaskMediaKind, file: File) =>
    (await api.post<TaskAttachment>(`/task/${id}/attachments`, file, {
      params: { kind }, headers: { 'Content-Type': 'application/octet-stream' },
    })).data,
  attachmentLink: async (id: number, attachment: string, signal?: AbortSignal) => {
    const { data } = await api.get<TaskAttachmentLink>(`/task/${id}/attachments/${attachment}`, { signal });
    return { ...data, url: api.getUri({ url: data.url }) };
  },
  count: async (user: number, date: string, excludeTaskId?: number, signal?: AbortSignal) =>
    (await api.get<PlanningCount>(`/task/user/${user}/planning-count`, { params: { date, excludeTaskId }, signal })).data,
  patchTask: async (id: number, body: TaskPatch) => {
    const path = `/task/${id}`;
    const response = body.descriptionDoc === undefined
      ? await api.patch<TaskMutation>(path, body)
      : await api.patch<TaskMutation>(path, body, { headers: { 'If-Match': `"${body.version}"` } });
    return response.data;
  },
  createTask: async (user: number, body: TaskCreation, key: string) =>
    (await api.post<TaskMutation>(`/task/user/${user}`, body, { headers: { 'Idempotency-Key': key } })).data,
  deleteTask: async (task: WorkTask) => (await api.delete<TaskDeletion>(`/task/${task.id}`, {
    headers: { 'If-Match': `"${task.version}"`, ...(task.project && { 'X-Project-Version': task.project.version }) },
  })).data,
  weeklySummary: async (user: number, startDate: string, endDate: string, signal?: AbortSignal) =>
    (await api.get<WeeklyResponse>(`/task/user/${user}/summary/weekly-counts`, { params: { startDate, endDate }, signal })).data,
};
