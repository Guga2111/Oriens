import { skipToken, useInfiniteQuery, useMutation, useMutationState, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { applyBoardMove, type BoardMove } from '@/lib/board-move';
import { isOpenStatus } from '@/lib/tasks';
import { workError } from '@/lib/work-form';
import { productNow } from '@/lib/product-time';
import { getDashboardData } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { taskService } from '@/services/taskService';
import { projectService, type BoardFilters } from '@/services/projectService';
import type { TaskListQuery } from '@/services/taskService';
import type { ProjectFilters } from '@/services/projectService';
import type { BoardResponse, TaskPatch, TaskCreation, TaskMutation, TaskDeletion, WorkTask, WorkProject, ProjectWrite, SidebarProject } from '@/types/work';

export const workKey = (user: number | null, family: string, ...params: unknown[]) => ['work', user, family, ...params] as const;
export function useWorkStatistics() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'statistics'), enabled: userId !== null,
    queryFn: ({ signal }) => getDashboardData(userId!, signal) });
}
export function useWorkSidebar() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'projects/sidebar'), enabled: userId !== null,
    queryFn: ({ signal }) => projectService.sidebar(userId!, signal) });
}
export function useWeeklySummary(start: string, end: string) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'tasks/week', start, end, 'summary'), enabled: userId !== null,
    queryFn: ({ signal }) => taskService.weeklySummary(userId!, start, end, signal) });
}
export function useTaskDay(date: string, enabled = true) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'tasks/day', date), enabled: userId !== null && enabled,
    queryFn: ({ signal }) => taskService.day(userId!, date, signal) });
}
export function useTaskWeek(start: string, end: string, enabled = true) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'tasks/week', start, end), enabled: userId !== null && enabled,
    queryFn: ({ signal }) => taskService.week(userId!, start, end, signal) });
}
export function useAllTasks(filters: TaskListQuery) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'tasks/all', filters), enabled: userId !== null,
    queryFn: ({ signal }) => taskService.all(userId!, filters, signal) });
}
export function useWorkProjects(filters: ProjectFilters) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'projects/list', filters), enabled: userId !== null,
    queryFn: ({ signal }) => projectService.projects(userId!, filters, signal) });
}
export function useWorkProject(id: number) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'projects/detail', id), enabled: userId !== null && id > 0,
    queryFn: ({ signal }) => projectService.project(id, signal) });
}
/** `placeholder` shows a confirmed list snapshot while the detail is fetched. */
export function useTaskDetail(id: number, placeholder?: WorkTask) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'tasks/detail', id), enabled: userId !== null && id > 0,
    placeholderData: placeholder, queryFn: ({ signal }) => taskService.task(id, signal) });
}
/** `keepPrevious` shows the same project's last board while new filters load (timeline window changes). */
export function useProjectBoard(id: number, filters: BoardFilters = {}, keepPrevious = false) {
  const { userId } = useAuth();
  return useQuery<BoardResponse>({ queryKey: workKey(userId, 'projects/board', id, filters), enabled: userId !== null && id > 0,
    placeholderData: keepPrevious ? (previous?: BoardResponse) => previous?.projectId === id ? previous : undefined : undefined,
    queryFn: ({ signal }) => projectService.board(id, filters, signal) });
}
export function usePlanningCount(date: string, exclude?: number) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'planning/count', date, exclude), enabled: userId !== null && Boolean(date),
    queryFn: ({ signal }) => taskService.count(userId!, date, exclude, signal) });
}

/** Recovery/attention can change on any day edit; only today's day view needs broad invalidation. */
export function taskAffectsKey(key: QueryKey, user: number, result: TaskMutation | TaskDeletion, today: string) {
  if (key[0] !== 'work' || key[1] !== user) return false;
  const dates = [result.previousPlannedDate, 'plannedDate' in result ? result.plannedDate : null].filter(Boolean) as string[];
  switch (key[2]) {
    case 'tasks/day': return key[3] === today || dates.includes(key[3] as string);
    case 'tasks/week': return dates.some(d => d >= (key[3] as string) && d <= (key[4] as string));
    case 'planning/count': return dates.includes(key[3] as string);
    case 'tasks/all': case 'projects/list': case 'projects/sidebar': return true;
    case 'home': return key[3] === 'recents';
    case 'statistics': return key.length === 3 || ['activity', 'planning', 'task-evidence', 'streak'].includes(key[3] as string);
    case 'projects/detail': case 'projects/board': case 'projects/objectives':
      return result.affectedProjectIds.includes(key[3] as number);
    default: return false;
  }
}
export async function refreshTask(client: QueryClient, user: number, result: TaskMutation | TaskDeletion) {
  if ('task' in result) client.setQueryData(workKey(user, 'tasks/detail', result.task.id), result.task);
  else client.removeQueries({ queryKey: workKey(user, 'tasks/detail', result.id) });
  // A failed refetch is a separate outcome from a confirmed write; never reject the mutation or retry POST.
  try {
    await client.invalidateQueries({ predicate: q => taskAffectsKey(q.queryKey, user, result, productNow().date) }, { throwOnError: true });
    return { saved: true as const, refreshFailed: false };
  } catch {
    return { saved: true as const, refreshFailed: true };
  }
}
export function useTaskWrites() {
  const { userId } = useAuth();
  const client = useQueryClient();
  const requireUser = () => { if (userId === null) throw new Error('Sessão necessária.'); return userId; };
  const patch = useMutation({ retry: false,
    mutationFn: async ({ id, body }: { id: number; body: TaskPatch }) => {
      const user = requireUser(); const result = await taskService.patchTask(id, body);
      return { result, ...await refreshTask(client, user, result) };
    } });
  const create = useMutation({ retry: false,
    mutationFn: async ({ body, key }: { body: TaskCreation; key: string }) => {
      const user = requireUser(); const result = await taskService.createTask(user, body, key);
      return { result, ...await refreshTask(client, user, result) };
    } });
  const remove = useMutation({ retry: false, mutationFn: async (task: WorkTask) => {
    const user = requireUser(); const result = await taskService.deleteTask(task);
    return { result, ...await refreshTask(client, user, result) };
  } });
  return { patch, create, remove };
}

/** The versioned server board stays available while pending moves are composed in its preview. */
export function useBoardTaskMoves(projectId: number, filters: BoardFilters) {
  const { userId, token } = useAuth();
  const client = useQueryClient();
  const boardPrefix = workKey(userId, 'projects/board', projectId);
  const boardKey = workKey(userId, 'projects/board', projectId, filters);
  const previewPrefix = workKey(userId, 'projects/board-preview', projectId);
  const previewKey = [...previewPrefix, filters];
  const mutationKey = workKey(userId, 'projects/board-move', projectId);
  const pending = { mutationKey, status: 'pending' as const };
  const preview = useQuery<BoardResponse | null>({ queryKey: previewKey, queryFn: skipToken });
  const moving = useMutationState({ filters: pending, select: mutation => (mutation.state.variables as BoardMove).taskId });

  function publishPreview(except?: BoardMove) {
    const commands = client.getMutationCache().findAll(pending)
      .map(mutation => mutation.state.variables as BoardMove)
      .filter(command => command !== except);
    // Replay remaining moves after rollback so one failure cannot undo another card's move.
    for (const query of client.getQueryCache().findAll({ queryKey: previewPrefix })) {
      const board = client.getQueryData<BoardResponse>([...boardPrefix, query.queryKey[4]]);
      if (!board) continue;
      client.setQueryData<BoardResponse | null>(query.queryKey, commands.length
        ? commands.reduce((current, command) => applyBoardMove(current, command), board)
        : null);
    }
  }

  const sessionIsCurrent = () => userId !== null && (token ?? null) === window.localStorage.getItem('authToken');
  const move = useMutation({
    mutationKey,
    // Reordering can bump neighboring task versions as well as the project's version.
    scope: { id: `board-move:${userId}:${projectId}` },
    retry: false,
    mutationFn: async (command: BoardMove) => {
      if (!sessionIsCurrent()) throw new Error('Sessão necessária.');
      const cached = client.getQueryState<BoardResponse>(boardKey);
      // A queued move can outlive the filter that was open when it was submitted.
      const board = cached?.data && !cached.isInvalidated ? cached.data
        : await client.fetchQuery({ queryKey: boardKey, queryFn: ({ signal }) => projectService.board(projectId, filters, signal) });
      if (!sessionIsCurrent()) throw new Error('Sessão necessária.');
      const task = board.tasks.find(row => row.id === command.taskId);
      if (!task) throw new Error('Tarefa indisponível no quadro.');
      return taskService.patchTask(task.id, {
        version: task.version, projectVersion: board.projectVersion,
        columnId: command.columnId, beforeTaskId: command.beforeTaskId,
      });
    },
    onSuccess: async (result, command) => {
      if (userId === null || !sessionIsCurrent()) return;
      const hidden = (Boolean(filters.open || filters.overdue) && !isOpenStatus(result.task.status))
        || !!(filters.status && !filters.status.split(",").includes(result.task.status));
      client.setQueryData<BoardResponse>(boardKey, board => {
        if (!board || (result.task.project?.version ?? 0) <= board.projectVersion) return board;
        return applyBoardMove(board, command, { task: result.task, hidden });
      });
      const { refreshFailed } = await refreshTask(client, userId, result);
      if (refreshFailed && sessionIsCurrent()) toast.warning('Movimento salvo. Recarregue o quadro para atualizar.');
    },
    onError: async (error, command) => {
      if (!sessionIsCurrent()) return;
      publishPreview(command);
      toast.error(workError(error));
      await client.invalidateQueries({ queryKey: boardPrefix });
    },
    onSettled: (_result, _error, command) => {
      if (sessionIsCurrent()) publishPreview(command);
    },
  });

  function moveTask(command: BoardMove) {
    const alreadyMoving = client.getMutationCache().findAll(pending)
      .some(mutation => (mutation.state.variables as BoardMove).taskId === command.taskId);
    if (alreadyMoving) return;
    const request = move.mutateAsync(command);
    // Publish before the drag preview unmounts so both layouts hand off in the same render.
    publishPreview();
    return request;
  }

  return { preview: preview.data, moving, moveTask };
}

export function useProjectFlags() {
  const { userId } = useAuth();
  const client = useQueryClient();
  return useMutation({ retry: false,
    mutationFn: async ({ project, field, value }: { project: WorkProject | SidebarProject; field: 'favorite' | 'archive'; value: boolean }) => {
      if (userId === null) throw new Error('Sessão necessária.');
      const result = await projectService.projectFlag(project, field, value);
      client.setQueryData(workKey(userId, 'projects/detail', result.id), result);
      try {
        await client.invalidateQueries({ predicate: q => {
          const k = q.queryKey;
          if (k[0] !== 'work' || k[1] !== userId) return false;
          if (['projects/list', 'projects/sidebar', 'statistics'].includes(k[2] as string)) return true;
          if (k[2] === 'home' && k[3] === 'recents') return true;
          if (['projects/board', 'projects/objectives'].includes(k[2] as string)) return k[3] === result.id;
          return field === 'archive' && (k[2] as string).startsWith('tasks/');
        } }, { throwOnError: true });
        return { result, saved: true as const, refreshFailed: false };
      } catch {
        return { result, saved: true as const, refreshFailed: true };
      }
    },
  });
}

/** The projects page, filtered by the API so every page is complete for the filters. */
export function useProjectPages(filters: Pick<ProjectFilters, 'favorite' | 'mode'> = {}) {
  const { userId } = useAuth();
  return useInfiniteQuery({ queryKey: workKey(userId, 'projects/list', 'pages', filters), enabled: userId !== null,
    initialPageParam: 0, queryFn: ({ pageParam, signal }) => projectService.projects(userId!, { ...filters, page: pageParam, size: 6 }, signal),
    getNextPageParam: page => page.number + 1 < page.totalPages ? page.number + 1 : undefined });
}
export function useDeletionPreview(id: number) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'projects/deletion-preview', id), enabled: userId !== null && id > 0,
    staleTime: 0, queryFn: ({ signal }) => projectService.preview(id, signal) });
}
export function useProjectWrites() {
  const { userId } = useAuth();
  const client = useQueryClient();
  return useMutation({ retry: false, mutationFn: async (command: ProjectWrite) => {
    if (userId === null) throw new Error('Sessão necessária.');
    const result = await projectService.write(userId, command);
    const id = command.action === 'create' ? (result ? result.id : undefined) : command.id;
    if (result) client.setQueryData(workKey(userId, 'projects/detail', result.id), result);
    if (command.action === 'delete') client.removeQueries({ queryKey: workKey(userId, 'projects/detail', id) });
    try {
      await client.invalidateQueries({ predicate: q => {
        const k = q.queryKey;
        if (k[0] !== 'work' || k[1] !== userId) return false;
        if (['projects/list', 'projects/sidebar', 'statistics'].includes(k[2] as string)) return true;
        if (k[2] === 'home' && k[3] === 'recents') return true;
        if ((k[2] as string).startsWith('projects/')) return k[3] === id && command.action !== 'delete';
        // Structural changes can update projections, links and states without changing planned dates.
        return command.action !== 'create' && ((k[2] as string).startsWith('tasks/') || k[2] === 'planning/count');
      } }, { throwOnError: true });
      return { result, refreshFailed: false };
    } catch { return { result, refreshFailed: true }; }
  } });
}
