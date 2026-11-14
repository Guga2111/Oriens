import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { BoardResponse, WorkProject, WorkTask } from '@/types/work';
export const objective = { id: 81, projectId: 9, title: 'Receber contatos pelo site', dueDate: '2026-11-20', status: 'PENDING' as const, position: 0, version: 3, nonCancelledTasks: 1, completedTasks: 0, cancelledTasks: 0 };
export const project: WorkProject = { id: 9, userId: 7, title: 'Site pessoal', description: null, color: null, imageUrl: null, mode: 'DEVELOPMENT', version: 4, favorite: false, archived: false, lastAccessed: null, defaultPendingColumnId: 11, defaultCompletedColumnId: 13, objectives: [objective], summary: { totalObjectives: 1, completedObjectives: 0, totalTasks: 1, nonCancelledTasks: 1, completedTasks: 0, cancelledTasks: 0, plannedTodayCount: 0, previousPlansCount: 0, overdueTaskCount: 0, dueTodayTaskCount: 0, overdueObjectiveCount: 0, nextPlannedTask: null, nextObjective: objective } };
export const task: WorkTask = { id: 42, userId: 7, title: 'Montar formulário', description: 'Descrição original', projectId: 9, objectiveId: 81, columnId: 11, position: 0, plannedDate: null, startTime: null, dueDate: null, completedAt: null, createdAt: '2026-11-01T12:00:00Z', priority: 'MEDIUM', status: 'PENDING', location: null, version: 2, project: { id: 9, title: project.title, archived: false, version: 4 }, objective: { id: 81, title: objective.title }, column: { id: 11, name: 'A fazer', kind: 'PENDING' } };
export const board: BoardResponse = { projectId: 9, projectVersion: 4, filtered: false, columns: [
  { id: 11, projectId: 9, name: 'A fazer', kind: 'PENDING', position: 0, version: 0, totalCount: 1, visibleCount: 1 },
  { id: 12, projectId: 9, name: 'Fazendo', kind: 'ON_DOING', position: 1, version: 0, totalCount: 0, visibleCount: 0 },
  { id: 13, projectId: 9, name: 'Concluídas', kind: 'CONCLUDED', position: 2, version: 0, totalCount: 0, visibleCount: 0 },
], tasks: [task], total: { totalTasks: 1, nonCancelledTasks: 1, completedTasks: 0, cancelledTasks: 0 }, visible: { totalTasks: 1, nonCancelledTasks: 1, completedTasks: 0, cancelledTasks: 0 } };
export function renderWork(node: ReactNode, route = '/projects') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}>{node}</MemoryRouter></QueryClientProvider>) };
}
export const pageOf = (content: unknown[]) => ({ content, number: 0, totalElements: content.length, totalPages: 1, last: true });
