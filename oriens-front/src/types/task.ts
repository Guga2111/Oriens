export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export enum Status {
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
  id: number;
  title: string;
  description?: string;
  /** `HH:mm:ss` — comparado como string, sem parse de fuso. */
  startTime: string | null;
  plannedDate?: string | null;
  projectId?: number | null;
  version?: number;
  /** `yyyy-MM-dd` — data local, sem `toISOString`. */
  dueDate: string | null;
  completedAt?: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt?: string;
  location?: LocationDTO;
}

export type TaskDTO = Task;

