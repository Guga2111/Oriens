import api from './api';
import type { Page } from '@/types/financial';
import type { WorkProject, BoardResponse, SidebarProject, ProjectWrite, DeletionPreview } from '@/types/work';

/** startDate/endDate (YYYY-MM-DD, together) bound the queried period; they are not task fields. */
export interface BoardFilters { objectiveId?: number; planning?: 'today' | 'unscheduled'; overdue?: boolean; open?: boolean; startDate?: string; endDate?: string }
export interface ProjectFilters {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
  includeArchived?: boolean;
  search?: string;
}

export const projectService = {
  preview: async (id: number, signal?: AbortSignal) =>
    (await api.get<DeletionPreview>(`/project/${id}/deletion-preview`, { signal })).data,
  write: async (user: number, command: ProjectWrite): Promise<WorkProject | void> => {
    if (command.action === 'create') return (await api.post<WorkProject>(`/project/user/${user}`, command.body,
      { headers: { 'Idempotency-Key': command.key } })).data;
    const url = `/project/${command.id}`;
    switch (command.action) {
      case 'metadata': return (await api.patch<WorkProject>(url, command.body)).data;
      case 'convert': return (await api.patch<WorkProject>(url + '/mode', { mode: 'DEVELOPMENT', version: command.version })).data;
      case 'delete': await api.delete(url, { headers: { 'If-Match': `"${command.version}"` } }); return;
      case 'picture': {
        const data = new FormData(); data.append('projectImage', command.file);
        return (await api.put<WorkProject>(url + '/picture', data, { headers: { 'If-Match': `"${command.version}"` } })).data;
      }
      case 'objective-create': await api.post(url + '/objectives', command.body, { headers: { 'Idempotency-Key': command.key } }); return;
      case 'objective-patch': await api.patch(url + `/objectives/${command.objectiveId}`, command.body); return;
      case 'objective-delete': await api.delete(url + `/objectives/${command.objective.id}`, { headers: {
        'If-Match': `"${command.objective.version}"`, 'X-Project-Version': command.projectVersion } }); return;
      case 'column-create': await api.post(url + '/columns', command.body, { headers: { 'Idempotency-Key': command.key } }); return;
      case 'column-patch': await api.patch(url + `/columns/${command.columnId}`, command.body); return;
      case 'column-order': await api.put(url + '/columns/order', command.body); return;
      case 'defaults': await api.patch(url + '/board-defaults', command.body); return;
      case 'column-remove': await api.post(url + `/columns/${command.columnId}/remove`, command.body); return;
    }
  },
  sidebar: async (user: number, signal?: AbortSignal) =>
    (await api.get<SidebarProject[]>(`/project/user/${user}/sidebar`, { signal })).data,
  projects: async (user: number, params: ProjectFilters, signal?: AbortSignal) =>
    (await api.get<Page<WorkProject>>(`/project/user/${user}`, { params, signal })).data,
  project: async (id: number, signal?: AbortSignal) => (await api.get<WorkProject>(`/project/${id}`, { signal })).data,
  board: async (id: number, params: BoardFilters, signal?: AbortSignal) =>
    (await api.get<BoardResponse>(`/project/${id}/board`, { params, signal })).data,
  projectFlag: async (project: WorkProject | SidebarProject, field: 'favorite' | 'archive', value: boolean) =>
    (await api.patch<WorkProject>(`/project/${project.id}/${field}`, {
      version: project.version, [field === 'archive' ? 'archived' : 'favorite']: value,
    })).data,
};
