/** P0 frozen wire contracts. Implemented in P2/P3; release still depends on P4–P6. SPEC §§4–11. */
export type Id = number; // positive integral JSON number; reject unsafe integers at client boundary
export type Version = number; // integral >= 0; never synthesized by client
export type DateOnly = string; // strict real Gregorian YYYY-MM-DD, no UTC conversion
export type TimeOnly = string; // HH:mm:ss, 00:00:00..23:59:59; UI writes seconds 00
export type Instant = string; // ISO 8601 UTC with Z
export type Mode = 'SIMPLE' | 'DEVELOPMENT';
export type Status = 'PENDING' | 'ON_DOING' | 'CONCLUDED' | 'CANCELLED';
export type ObjectiveStatus = 'PENDING' | 'CONCLUDED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export const timezone = 'America/Recife' as const;

export interface Location {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}
export interface Objective {
  id: Id; projectId: Id; title: string; dueDate: DateOnly | null;
  status: ObjectiveStatus; position: number; version: Version;
  nonCancelledTasks?: number | null; completedTasks?: number | null; cancelledTasks?: number | null;
}
export interface Column {
  id: Id; projectId: Id; name: string; kind: Status; position: number; version: Version;
}
export interface Task {
  id: Id; userId: Id; title: string; description: string | null;
  projectId: Id | null; objectiveId: Id | null; columnId: Id | null; position: number | null;
  plannedDate: DateOnly | null; startTime: TimeOnly | null; dueDate: DateOnly | null;
  status: Status; priority: Priority; completedAt: DateOnly | null; createdAt: Instant;
  version: Version; location: Location | null;
  project: { id: Id; title: string; archived: boolean; version: Version } | null;
  objective: { id: Id; title: string } | null;
  column: { id: Id; name: string; kind: Status } | null;
}
export interface ProjectSummary {
  totalObjectives: number; completedObjectives: number; overdueObjectiveCount: number;
  // SIMPLE: all task counts and nextPlannedTask are null, not a fictitious zero.
  totalTasks: number | null; nonCancelledTasks: number | null;
  completedTasks: number | null; cancelledTasks: number | null;
  plannedTodayCount: number | null; previousPlansCount: number | null;
  overdueTaskCount: number | null; dueTodayTaskCount: number | null;
  nextPlannedTask: Task | null; nextObjective: Objective | null;
}
export interface Project {
  id: Id; userId: Id; title: string; description: string | null; color: string | null;
  imageUrl: string | null; mode: Mode; favorite: boolean; archived: boolean;
  lastAccessed: Instant | null; defaultPendingColumnId: Id | null;
  defaultCompletedColumnId: Id | null; version: Version; summary: ProjectSummary;
}
export interface ProjectDetail extends Project { objectives: Objective[] }
export interface SidebarProject {
  id: Id; title: string; color: string | null; mode: Mode; favorite: boolean;
  archived: boolean; lastAccessed: Instant | null; version: Version;
}
export interface Page<T> {
  content: T[]; number: number; size: number; totalElements: number; totalPages: number;
}
export interface TaskCounts {
  totalTasks: number; nonCancelledTasks: number; completedTasks: number; cancelledTasks: number;
}
export interface Board {
  projectId: Id; projectVersion: Version;
  columns: (Column & { totalCount: number; visibleCount: number })[];
  tasks: Task[]; total: TaskCounts; visible: TaskCounts; filtered?: boolean;
}
export interface Day {
  date: DateOnly; timezone: typeof timezone;
  planned: Task[]; previousPlans: Task[]; deadlineAttention: Task[]; completed: Task[];
}
export interface Range {
  startDate: DateOnly; endDate: DateOnly; timezone: typeof timezone; tasks: Task[];
}
export interface PlanningCount { date: DateOnly; activeCount: number; completedCount: number }
export interface DeletionPreview {
  projectVersion: Version; objectiveCount: number; columnCount: number; taskCount: number;
}
export interface TaskMutation {
  task: Task; affectedProjectIds: Id[];
  previousPlannedDate: DateOnly | null; plannedDate: DateOnly | null;
}
export interface TaskDeletion {
  id: Id; affectedProjectIds: Id[]; previousPlannedDate: DateOnly | null;
}
export interface ColumnRemoval {
  projectId: Id; projectVersion: Version; movedTaskCount: number;
  invalidateBoard: true; // includes task versions, positions and new defaults
}
export interface ObjectiveMutation { objective: Objective; projectVersion: Version }
export interface ObjectiveDeletion {
  projectId: Id; projectVersion: Version; detachedTaskCount: number;
}
export interface BoardConfigMutation {
  projectId: Id; projectVersion: Version; columns: Column[];
  defaultPendingColumnId: Id; defaultCompletedColumnId: Id;
}
export interface ErrorResponse {
  code: 'INVALID_REQUEST' | 'UNAUTHENTICATED' | 'NOT_FOUND' | 'DOMAIN_VIOLATION'
    | 'VERSION_CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'PRECONDITION_REQUIRED'
    | 'CLIENT_UPGRADE_REQUIRED' | 'RESOURCE_GONE' | 'INTERNAL_ERROR';
  message: string; fieldErrors: { field: string; message: string }[]; requestId: string;
  currentVersion?: Version; // only after ownership is established
}

export interface NewObjective { title: string; dueDate?: DateOnly | null }
export interface CreateProject {
  title: string; mode: Mode; description?: string | null; color?: string | null;
  objectives?: NewObjective[];
}
export interface PatchProject {
  version: Version; title?: string; description?: string | null; color?: string | null;
}
export interface ConvertProject { version: Version; mode: 'DEVELOPMENT' }
export interface FavoriteProject { version: Version; favorite: boolean }
export interface ArchiveProject { version: Version; archived: boolean }
export interface CreateObjective extends NewObjective { projectVersion: Version }
export interface PatchObjective {
  version: Version; title?: string; dueDate?: DateOnly | null; status?: ObjectiveStatus;
}
export interface CreateColumn { name: string; kind: Status; projectVersion: Version }
export interface PatchColumn {
  version: Version; projectVersion: Version; name?: string; kind?: Status;
}
export interface OrderColumns { columnIds: Id[]; projectVersion: Version }
export interface BoardDefaults {
  pendingColumnId: Id; completedColumnId: Id; projectVersion: Version;
}
export interface RemoveColumn {
  targetColumnId?: Id; replacementPendingColumnId?: Id; replacementCompletedColumnId?: Id;
  projectVersion: Version;
}
export interface CreateTask {
  title: string; description?: string | null; projectId?: Id | null; projectVersion?: Version;
  objectiveId?: Id | null; columnId?: Id | null;
  plannedDate?: DateOnly | null; startTime?: TimeOnly | null; dueDate?: DateOnly | null;
  priority?: Priority; location?: Location | null;
}
export interface PatchTask {
  version: Version; projectVersion?: Version; targetProjectVersion?: Version;
  title?: string; description?: string | null; projectId?: Id | null;
  objectiveId?: Id | null; columnId?: Id; status?: Status;
  plannedDate?: DateOnly | null; startTime?: TimeOnly | null; dueDate?: DateOnly | null;
  priority?: Priority; location?: Location | null; beforeTaskId?: Id | null;
}
export interface BoardFilters {
  objectiveId?: Id; planning?: 'today' | 'unscheduled'; overdue?: boolean; open?: boolean;
}
export interface TaskFilters {
  page?: number; size?: number; search?: string; status?: Status; projectId?: Id;
  dateField?: 'plannedDate' | 'dueDate'; startDate?: DateOnly; endDate?: DateOnly;
}
