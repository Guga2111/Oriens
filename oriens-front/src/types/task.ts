export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export enum Status {
  PENDING = "PENDING",
  CONCLUDED = "CONCLUDED"
}

export const PriorityLabels: Record<Priority, string> = {
  [Priority.LOW]: "Baixa",
  [Priority.MEDIUM]: "Média",
  [Priority.HIGH]: "Alta"
};

export const StatusLabels: Record<Status, string> = {
  [Status.PENDING]: "Pendente",
  [Status.CONCLUDED]: "Concluída"
};

export const PriorityColors: Record<Priority, string> = {
  [Priority.LOW]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  [Priority.MEDIUM]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  [Priority.HIGH]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

export const StatusColors: Record<Status, string> = {
  [Status.PENDING]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  [Status.CONCLUDED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
};

export interface LocationDTO {
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface TaskDTO {
  id: number;
  title: string;
  description?: string;
  startTime: string; // "HH:mm:ss"
  dueDate: string; // "YYYY-MM-DD"
  completedAt?: string;
  priority: Priority;
  status: Status;
  createdAt: string;
  location?: LocationDTO;
}

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
