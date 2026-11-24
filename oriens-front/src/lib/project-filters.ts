import type { WorkProject } from '@/types/work';

/** An empty `modes` list shows every kind of project. */
export type ProjectFilters = { favoritesOnly: boolean; modes: WorkProject['mode'][] };

export const NO_PROJECT_FILTERS: ProjectFilters = { favoritesOnly: false, modes: [] };

export const activeProjectFilterCount = (filters: ProjectFilters) => Number(filters.favoritesOnly) + filters.modes.length;

export const matchesProjectFilters = (project: WorkProject, filters: ProjectFilters) =>
  (!filters.favoritesOnly || project.favorite) && (filters.modes.length === 0 || filters.modes.includes(project.mode));
