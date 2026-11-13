import { format } from "date-fns";
import type { TaskStatus } from "./task";

/** Objetivo de projeto — o backend o endereça por índice, não por id. */
export interface ObjectiveDTO {
  title: string;
  dueDate?: string;
  status: TaskStatus;
  completed?: boolean;
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
