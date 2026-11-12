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

export interface ProjectDTO {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  color?: string;
  favorite: boolean;
  archived?: boolean;
  lastAccessed?: string;
  progress: number;
  totalObjectives: number;
  objectives: ObjectiveDTO[];
}

export interface ObjectiveDTO {
  title: string;
  dueDate?: string;
  status: Status;
  completed: boolean;
}
