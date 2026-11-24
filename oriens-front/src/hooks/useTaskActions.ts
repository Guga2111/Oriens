import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { taskAffectsKey, useTaskWrites } from './useWork';
import type { Task, TaskStatus } from '@/types/task';
import { toast } from 'sonner';
import { productNow } from '@/lib/product-time';
import type { TaskPatch, WorkTask } from '@/types/work';

/** Day/week and board share the same writes and invalidation owner. */
export function useTaskActions() {
  const writes = useTaskWrites();
  const client = useQueryClient();
  const { userId } = useAuth();
  const refresh = async (task: Task) => {
    if (userId === null) return;
    await client.invalidateQueries({ predicate: q => taskAffectsKey(q.queryKey, userId, { task: task as WorkTask, previousPlannedDate: task.plannedDate ?? null, plannedDate: task.plannedDate ?? null, affectedProjectIds: task.projectId ? [task.projectId] : [] }, productNow().date) });
  };
  const [localError, setLocalError] = useState<unknown>(null);
  const requireSnapshot = (task: Task) => {
    setLocalError(null);
    if (task.version === undefined || (task.projectId && !task.project)) { const error = new Error('Recarregue os dados da tarefa antes de alterar.'); setLocalError(error); throw error; }
    return task as WorkTask;
  };
  const patch = async (task: Task, body: Partial<TaskPatch>) => {
    const snapshot = requireSnapshot(task);
    let result;
    try {
      result = await writes.patch.mutateAsync({ id: task.id, body: { ...body, version: snapshot.version, ...(snapshot.project ? { projectVersion: snapshot.project.version } : {}) } });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) await refresh(task);
      throw error;
    }
    if (result.refreshFailed) toast.warning('Alteração salva; não foi possível atualizar a lista.');
    else toast.success('Tarefa atualizada.');
    return result;
  };
  return {
    refresh,
    planning: (task: Task, today: boolean) => patch(task, { plannedDate: today ? productNow().date : null, startTime: null }),
    error: localError || writes.patch.error || writes.remove.error,
    status: (task: Task, status: TaskStatus) => patch(task, { status }),
    /** Saves any subset of the task's fields with its current version. */
    update: (task: Task, body: Partial<TaskPatch>) => patch(task, body),
    remove: async (task: Task) => {
      const result = await writes.remove.mutateAsync(requireSnapshot(task));
      if (result.refreshFailed) toast.warning('Tarefa excluída; não foi possível atualizar a lista.');
      else toast.success('Tarefa excluída.');
      return result;
    },
  };
}
