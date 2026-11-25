import api from './api';
import type { TaskLabel, TaskLabelInput } from '@/types/task-label';

export type TaskLabelWrite =
  | { action: 'create'; body: TaskLabelInput; key: string }
  | { action: 'update'; label: TaskLabel; body: TaskLabelInput }
  | { action: 'delete'; label: TaskLabel };
export const taskLabelService = {
  list: async (user: number, signal?: AbortSignal) => (await api.get<TaskLabel[]>(`/task-labels/user/${user}`, { signal })).data,
  write: async (user: number, command: TaskLabelWrite): Promise<TaskLabel | null> => {
    if (command.action === 'create') return (await api.post<TaskLabel>(`/task-labels/user/${user}`, command.body, { headers: { 'Idempotency-Key': command.key } })).data;
    const headers = { 'If-Match': `"${command.label.version}"` };
    if (command.action === 'update') return (await api.put<TaskLabel>(`/task-labels/${command.label.id}`, command.body, { headers })).data;
    await api.delete(`/task-labels/${command.label.id}`, { headers }); return null;
  },
};
