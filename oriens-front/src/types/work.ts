import type { LocationDTO, TaskPriority, TaskStatus } from './task';

export interface WorkTask {
  id: number; userId: number; title: string; description: string | null;
  projectId: number | null; objectiveId: number | null; columnId: number | null; position: number | null;
  plannedDate: string | null; startTime: string | null; dueDate: string | null; completedAt: string | null;
  createdAt: string; priority: TaskPriority; status: TaskStatus; location: LocationDTO | null; version: number;
  project: { id: number; title: string; archived: boolean; version: number } | null;
  objective: { id: number; title: string } | null;
  column: { id: number; name: string; kind: TaskStatus } | null;
}
export interface WorkObjective {
  id: number; projectId: number; title: string; dueDate: string | null;
  status: 'PENDING' | 'CONCLUDED'; position: number; version: number;
  nonCancelledTasks: number | null; completedTasks: number | null; cancelledTasks: number | null;
}
export interface WorkColumn {
  id: number; projectId: number; name: string; kind: TaskStatus; position: number; version: number;
}
export interface ProjectSummary {
  totalObjectives: number; completedObjectives: number; totalTasks: number | null;
  nonCancelledTasks: number | null; completedTasks: number | null; cancelledTasks: number | null;
  plannedTodayCount: number | null; previousPlansCount: number | null; overdueTaskCount: number | null;
  dueTodayTaskCount: number | null; overdueObjectiveCount: number;
  nextPlannedTask: WorkTask | null; nextObjective: WorkObjective | null;
}
export interface WorkProject {
  id: number; userId: number; title: string; description: string | null; color: string | null; imageUrl: string | null;
  mode: 'SIMPLE' | 'DEVELOPMENT'; favorite: boolean; archived: boolean; lastAccessed: string | null;
  defaultPendingColumnId: number | null; defaultCompletedColumnId: number | null; version: number;
  objectives: WorkObjective[] | null; summary: ProjectSummary;
}
export interface DayResponse {
  date: string; timezone: string; planned: WorkTask[]; previousPlans: WorkTask[];
  deadlineAttention: WorkTask[]; completed: WorkTask[];
}
export interface RangeResponse { startDate: string; endDate: string; timezone: string; tasks: WorkTask[] }
export interface PlanningCount { date: string; activeCount: number; completedCount: number }
export interface TaskCounts { totalTasks: number; nonCancelledTasks: number; completedTasks: number; cancelledTasks: number }
export interface BoardResponse {
  projectId: number; projectVersion: number; filtered: boolean;
  columns: (WorkColumn & { totalCount: number; visibleCount: number })[];
  tasks: WorkTask[]; total: TaskCounts; visible: TaskCounts;
}
export interface TaskMutation {
  task: WorkTask; affectedProjectIds: number[]; previousPlannedDate: string | null; plannedDate: string | null;
}
export interface TaskDeletion { id: number; affectedProjectIds: number[]; previousPlannedDate: string | null }
export interface TaskPatch {
  version: number; projectVersion?: number; targetProjectVersion?: number;
  title?: string; description?: string | null; projectId?: number | null; objectiveId?: number | null;
  columnId?: number; status?: TaskStatus; plannedDate?: string | null; startTime?: string | null;
  dueDate?: string | null; priority?: TaskPriority; location?: LocationDTO | null; beforeTaskId?: number | null;
}
export type TaskCreation = Omit<TaskPatch, 'version' | 'targetProjectVersion' | 'beforeTaskId' | 'status'> & { title: string };

export interface ProjectTotals { totalProjects: number; activeProjects: number; favoriteProjects: number; archivedProjects: number }
export interface WeeklyResponse { startDate: string; endDate: string; timezone: string; completedTasks: number; totalTasks: number }
export type SidebarProject = Pick<WorkProject, 'id' | 'title' | 'color' | 'mode' | 'favorite' | 'archived' | 'lastAccessed' | 'version'>;
