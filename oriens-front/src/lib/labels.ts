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

/** Status de ticket de suporte (SPEC §11.10). */
export const SUPPORT_STATUS = {
  OPEN: { label: "Aberto", badge: "negative" },
  IN_PROGRESS: { label: "Em andamento", badge: "warning" },
  CLOSED: { label: "Fechado", badge: "positive" },
} as const;

/** Papel do usuário na plataforma (SPEC §11.10). */
export const USER_ROLE = {
  ADMIN: { label: "Admin", badge: "default" },
  USER: { label: "Usuário", badge: "secondary" },
} as const;

export type PriorityKey = keyof typeof PRIORITY;
export type TaskStatusKey = keyof typeof TASK_STATUS;
export type SupportStatusKey = keyof typeof SUPPORT_STATUS;
export type UserRoleKey = keyof typeof USER_ROLE;
