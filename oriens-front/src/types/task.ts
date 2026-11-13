export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export enum Status {
  PENDING = "PENDING",
  ON_DOING = "ON_DOING",
  CONCLUDED = "CONCLUDED"
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
  startTime: string;
  /** `yyyy-MM-dd` — data local, sem `toISOString`. */
  dueDate: string;
  completedAt?: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt?: string;
  location?: LocationDTO;
}

export type TaskDTO = Task;

// Reexportado para consumidores ainda não migrados; a definição única vive em
// `types/project.ts` (SPEC §10.3/P1.4).
export type { ObjectiveDTO, ProjectDTO } from "./project";

