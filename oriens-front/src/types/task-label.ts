export const TASK_LABEL_COLORS = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'GRAY'] as const;
export type TaskLabelColor = typeof TASK_LABEL_COLORS[number];
export interface TaskLabel { id: number; name: string; color: TaskLabelColor; version: number }
export interface TaskLabelInput { name: string; color: TaskLabelColor }
