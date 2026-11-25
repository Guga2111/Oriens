import type { WorkObjective, WorkTask } from '@/types/work';

export type ObjectiveStatus = WorkObjective['status'];
export const OBJECTIVE_STATUSES: { value: ObjectiveStatus; label: string }[] = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'PENDING', label: 'Planejado' },
  { value: 'ON_DOING', label: 'Em andamento' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'CONCLUDED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
];
export const objectiveStatusLabel = (status: ObjectiveStatus) => OBJECTIVE_STATUSES.find(item => item.value === status)!.label;
export const isActiveObjective = (objective: WorkObjective) => objective.status !== 'CONCLUDED' && objective.status !== 'CANCELLED';

/** Pinned objectives first, then the order the person gave them; `position` itself never changes. */
export const pinnedFirst = (objectives: WorkObjective[]) =>
  [...objectives].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.position - b.position || a.id - b.id);

/**
 * Parts of an objective's progress bar, over its non-cancelled tasks: done, in progress and the rest. Done comes from
 * the API count; in progress from the project's tasks when the page has them (otherwise it counts as the rest).
 */
export function objectiveProgressParts(objective: WorkObjective, tasks?: Pick<WorkTask, 'objectiveId' | 'status'>[]) {
  const total = objective.nonCancelledTasks ?? 0;
  const done = Math.min(objective.completedTasks ?? 0, total);
  const started = Math.min(tasks?.filter(task => task.objectiveId === objective.id && task.status === 'ON_DOING').length ?? 0, total - done);
  return { total, done, started, rest: total - done - started };
}
