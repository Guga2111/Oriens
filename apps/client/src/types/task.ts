import type { TaskLabel } from './task-label';
export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
  NONE = "NONE"
}

export enum Status {
  BACKLOG = "BACKLOG",
  PENDING = "PENDING",
  ON_DOING = "ON_DOING",
  CONCLUDED = "CONCLUDED",
  CANCELLED = "CANCELLED"
}

export type TaskPriority = `${Priority}`;
export type TaskStatus = `${Status}`;

export interface LocationDTO {
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface Task {
  descriptionText?: string | null;
  labels?: TaskLabel[];
  id: number;
  title: string;
  description?: string;
  /** `HH:mm:ss` — comparado como string, sem parse de fuso. */
  startTime: string | null;
  plannedDate?: string | null;
  projectId?: number | null;
  version?: number;
  project?: { id: number; title: string; archived: boolean; version: number } | null;
  objective?: { id: number; title: string } | null;
  column?: { id: number; name: string; kind: TaskStatus } | null;
  /** `yyyy-MM-dd` — data local, sem `toISOString`. */
  dueDate: string | null;
  completedAt?: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt?: string;
  location?: LocationDTO;
}

export type TaskDTO = Task;

