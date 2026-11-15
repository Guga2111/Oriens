import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { taskLabelService, type TaskLabelWrite } from '@/services/taskLabelService';
import { workKey } from '@/hooks/useWork';
import type { TaskLabel } from '@/types/task-label';

export function useTaskLabels() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'tasks/labels'), enabled: userId !== null,
    queryFn: ({ signal }) => taskLabelService.list(userId!, signal) });
}
export function useTaskLabelWrites() {
  const { userId } = useAuth(); const client = useQueryClient();
  return useMutation({ retry: false, mutationFn: async (command: TaskLabelWrite) => {
    if (userId === null) throw new Error('Sessão necessária.');
    const label = await taskLabelService.write(userId, command);
    client.setQueryData<TaskLabel[]>(workKey(userId, 'tasks/labels'), previous => {
      const rows = (previous ?? []).filter(row => row.id !== (label?.id ?? (command.action !== 'create' ? command.label.id : null)));
      return [...rows, ...(label ? [label] : [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    });
    try {
      // Definitions are shared by projections across every project and calendar date.
      await client.invalidateQueries({ predicate: query => {
        const key = query.queryKey;
        return key[0] === 'work' && key[1] === userId && (key[2] === 'tasks/labels' ||
          command.action !== 'create' && ['tasks/day','tasks/week','tasks/all','tasks/detail','projects/board','projects/detail','projects/list'].includes(key[2] as string));
      } }, { throwOnError: true });
      return { label, refreshFailed: false };
    } catch { return { label, refreshFailed: true }; }
  } });
}
