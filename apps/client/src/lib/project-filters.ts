import { taskFilterQuery, taskFiltersFromParams } from '@/lib/task-filters';
import type { BoardFilters, ProjectFilters as ProjectQuery } from '@/services/projectService';
import type { WorkProject } from '@/types/work';

/** An empty `modes` list shows every kind of project. */
export type ProjectFilters = { favoritesOnly: boolean; modes: WorkProject['mode'][] };

export const NO_PROJECT_FILTERS: ProjectFilters = { favoritesOnly: false, modes: [] };

export const activeProjectFilterCount = (filters: ProjectFilters) => Number(filters.favoritesOnly) + filters.modes.length;

/** The API query for the chosen filters; both kinds ticked is the same as none. */
export const projectQueryOf = (filters: ProjectFilters): Pick<ProjectQuery, 'favorite' | 'mode'> => ({
  ...(filters.favoritesOnly ? { favorite: true } : {}),
  ...(filters.modes.length === 1 ? { mode: filters.modes[0] } : {}),
});

export function boardFiltersFromParams(params: URLSearchParams) {
  const taskFilters = taskFiltersFromParams(params);
  const objectiveId = params.get('objective');
  const planning = params.get('planning');
  const filters: BoardFilters = {
    ...taskFilterQuery(taskFilters),
    ...(objectiveId && { objectiveId: Number(objectiveId) }),
    ...((planning === 'today' || planning === 'unscheduled') && { planning }),
    ...(params.get('overdue') === '1' && { overdue: true }),
    ...(params.get('open') === '1' && { open: true }),
  };
  return { taskFilters, filters };
}
