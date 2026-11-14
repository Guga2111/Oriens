import api from './api';
import type { Page } from '@/types/financial';
import type { WorkProject, BoardResponse, ProjectTotals, SidebarProject } from '@/types/work';

export interface BoardFilters { objectiveId?: number; planning?: 'today' | 'unscheduled'; overdue?: boolean; open?: boolean }
export interface ProjectFilters {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
  includeArchived?: boolean;
  search?: string;
}

export const projectService = {
  sidebar: async (user: number, signal?: AbortSignal) =>
    (await api.get<SidebarProject[]>(`/project/user/${user}/sidebar`, { signal })).data,
  totals: async (user: number, signal?: AbortSignal) =>
    (await api.get<ProjectTotals>(`/project/user/${user}/summary`, { signal })).data,
  projects: async (user: number, params: ProjectFilters, signal?: AbortSignal) =>
    (await api.get<Page<WorkProject>>(`/project/user/${user}`, { params, signal })).data,
  project: async (id: number, signal?: AbortSignal) => (await api.get<WorkProject>(`/project/${id}`, { signal })).data,
  board: async (id: number, params: BoardFilters, signal?: AbortSignal) =>
    (await api.get<BoardResponse>(`/project/${id}/board`, { params, signal })).data,
  projectFlag: async (project: WorkProject, field: 'favorite' | 'archive', value: boolean) =>
    (await api.patch<WorkProject>(`/project/${project.id}/${field}`, {
      version: project.version, [field === 'archive' ? 'archived' : 'favorite']: value,
    })).data,
};
