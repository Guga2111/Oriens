import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { productNow } from '@/lib/product-time';
import { getDashboardData } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { taskService } from '@/services/taskService';
import { projectService, type BoardFilters } from '@/services/projectService';
import type { TaskFilters } from '@/services/taskService';
import type { ProjectFilters } from '@/services/projectService';
import type { TaskPatch, TaskCreation, TaskMutation, TaskDeletion, WorkTask, WorkProject, ProjectWrite, SidebarProject } from '@/types/work';

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
export function useProjectTotals() {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'projects/list', 'summary'), enabled: userId !== null,
    queryFn: ({ signal }) => projectService.totals(userId!, signal) });
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
export function useAllTasks(filters: TaskFilters) {
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
export function useProjectBoard(id: number, filters: BoardFilters = {}) {
  const { userId } = useAuth();
  return useQuery({ queryKey: workKey(userId, 'projects/board', id, filters), enabled: userId !== null && id > 0,
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

export function useProjectPages() {
  const { userId } = useAuth();
  return useInfiniteQuery({ queryKey: workKey(userId, 'projects/list', 'pages'), enabled: userId !== null,
    initialPageParam: 0, queryFn: ({ pageParam, signal }) => projectService.projects(userId!, { page: pageParam, size: 6 }, signal),
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
        if ((k[2] as string).startsWith('projects/')) return k[3] === id && command.action !== 'delete';
        // Structural changes can update projections, links and states without changing planned dates.
        return command.action !== 'create' && ((k[2] as string).startsWith('tasks/') || k[2] === 'planning/count');
      } }, { throwOnError: true });
      return { result, refreshFailed: false };
    } catch { return { result, refreshFailed: true }; }
  } });
}
