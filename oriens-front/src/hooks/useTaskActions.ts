import { useState } from 'react';
import { useTaskWrites } from './useWork';
import type { Task, TaskStatus } from '@/types/task';
import type { WorkTask } from '@/types/work';

/** Day/week and board share the same writes and invalidation owner. */
export function useTaskActions() {
  const writes = useTaskWrites();
  const [localError, setLocalError] = useState<unknown>(null);
  const requireSnapshot = (task: Task) => {
    setLocalError(null);
    if (task.version === undefined || (task.projectId && !task.project)) { const error = new Error('Recarregue os dados da tarefa antes de alterar.'); setLocalError(error); throw error; }
    return task as WorkTask;
  };
  return {
    error: localError || writes.patch.error || writes.remove.error,
    status: (task: Task, status: TaskStatus) => {
      const snapshot = requireSnapshot(task);
      return writes.patch.mutateAsync({ id: task.id, body: { version: snapshot.version, ...(snapshot.project ? { projectVersion: snapshot.project.version } : {}), status } });
    },
    remove: (task: Task) => writes.remove.mutateAsync(requireSnapshot(task)),
  };
}
