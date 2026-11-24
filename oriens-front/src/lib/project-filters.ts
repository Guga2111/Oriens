import type { ProjectFilters as ProjectQuery } from '@/services/projectService';
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
