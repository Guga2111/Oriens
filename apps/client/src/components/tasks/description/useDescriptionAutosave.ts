import { replaceEqualDeep, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useCallback, useEffect } from 'react';
import { refreshTask, workKey } from '@/hooks/useWork';
import { workError } from '@/lib/work-form';
import { taskService } from '@/services/taskService';
import type { TaskDescriptionDocument, WorkTask } from '@/types/work';

type Draft = {
  document: TaskDescriptionDocument | null;
  base: WorkTask;
  revision: number;
  status: 'dirty' | 'saving' | 'error' | 'conflict';
  message?: string;
  remote?: WorkTask;
};

function sameDescription(left: WorkTask, right: WorkTask) {
  return left.description === right.description &&
    replaceEqualDeep(left.descriptionDoc ?? null, right.descriptionDoc ?? null) === (left.descriptionDoc ?? null);
}

async function persist(client: QueryClient, key: ReturnType<typeof workKey>, retry = false) {
  const sent = client.getQueryData<Draft>(key);
  if (!sent || (sent.status !== 'dirty' && !(retry && sent.status === 'error'))) return;
  const { base, document } = sent;
  client.setQueryData<Draft>(key, { ...sent, status: 'saving', message: undefined });
  const update = (change: (current: Draft) => Draft | null) =>
    client.setQueryData<Draft | null>(key, current => current ? change(current) : current);
  const patch = (snapshot: WorkTask) => taskService.patchTask(snapshot.id, {
    descriptionDoc: document,
    version: snapshot.version,
    ...(snapshot.project && { projectVersion: snapshot.project.version }),
  });

  try {
    let result;
    try {
      result = await patch(base);
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 409) throw error;
      const remote = await taskService.task(base.id);
      if (!client.getQueryData<Draft>(key)) return;
      client.setQueryData(workKey(base.userId, 'tasks/detail', base.id), remote);
      if (!sameDescription(base, remote)) {
        update(current => ({ ...current, remote, status: 'conflict' }));
        return;
      }
      // A concurrent edit to other fields can be safely rebased once.
      update(current => ({ ...current, base: remote }));
      result = await patch(remote);
    }
    if (!client.getQueryData<Draft>(key)) return;
    const refreshing = refreshTask(client, base.userId, result);
    update(current => current.revision === sent.revision
      ? null
      : { ...current, base: result.task, status: 'dirty' });
    await refreshing;
    // Flush the next snapshot even if the user closed the panel during the first write.
    await persist(client, key);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 409 && client.getQueryData<Draft>(key)) {
      try {
        const remote = await taskService.task(base.id);
        update(current => ({ ...current, base: remote, remote, status: 'conflict' }));
        return;
      } catch (reloadError) {
        update(current => ({ ...current, status: 'error', message: workError(reloadError) }));
        return;
      }
    }
    update(current => ({ ...current, status: 'error', message: workError(error) }));
  }
}

export function useDescriptionAutosave(task: WorkTask) {
  const client = useQueryClient();
  const { id, userId } = task;
  const queryKey = workKey(userId, 'task-description-draft', id);
  const { data: draft } = useQuery<Draft | null>({
    queryKey, enabled: false, queryFn: () => null, initialData: null, gcTime: Infinity,
  });

  const flush = useCallback((retry = false) => {
    void persist(client, workKey(userId, 'task-description-draft', id), retry);
  }, [client, userId, id]);

  useEffect(() => {
    if (draft?.status !== 'dirty') return;
    const timer = window.setTimeout(flush, 600);
    return () => window.clearTimeout(timer);
  }, [draft, flush]);

  useEffect(() => () => flush(), [flush]);

  function change(document: TaskDescriptionDocument | null) {
    client.setQueryData<Draft>(queryKey, current => ({
      ...current,
      base: current?.base ?? task,
      document,
      revision: (current?.revision ?? 0) + 1,
      status: current?.status === 'saving' || current?.status === 'conflict' ? current.status : 'dirty',
      message: undefined,
    }));
  }

  function chooseRemote() {
    if (draft?.remote) client.setQueryData(workKey(userId, 'tasks/detail', id), draft.remote);
    client.setQueryData(queryKey, null);
  }

  function keepDraft() {
    if (!draft?.remote) return;
    client.setQueryData<Draft>(queryKey, { ...draft, base: draft.remote, remote: undefined, status: 'dirty' });
    flush();
  }

  return { draft, change, flush, chooseRemote, keepDraft };
}
