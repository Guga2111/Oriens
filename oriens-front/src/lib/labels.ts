import type { TaskPriority, TaskStatus } from "@/types/task";

/** Vocabulário único de prioridade (SPEC §10.4). */
export const PRIORITY = {
  HIGH: { label: "Alta", badge: "negative" },
  MEDIUM: { label: "Média", badge: "warning" },
  LOW: { label: "Baixa", badge: "outline" },
} as const satisfies Record<TaskPriority, { label: string; badge: string }>;

/** Vocabulário único de status de tarefa (SPEC §10.4, D9). */
export const TASK_STATUS = {
  PENDING: { label: "A fazer", badge: "outline" },
  ON_DOING: { label: "Em andamento", badge: "warning" },
  CONCLUDED: { label: "Concluída", badge: "positive" },
} as const satisfies Record<TaskStatus, { label: string; badge: string }>;

export type PriorityKey = keyof typeof PRIORITY;
export type TaskStatusKey = keyof typeof TASK_STATUS;
