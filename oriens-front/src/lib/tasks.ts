import type { Task } from "@/types/task";

export interface TaskPeriod {
  id: "morning" | "afternoon" | "night";
  title: string;
  start: string;
  end: string;
  range: string;
  emptyLabel: string;
}

/**
 * Fronteiras dos períodos fixadas pela SPEC/§11.1 e pelos testes de
 * caracterização: 11:59:59/12:00:00 e 17:59:59/18:00:00.
 */
export const TASK_PERIODS: readonly TaskPeriod[] = [
  {
    id: "morning",
    title: "Manhã",
    start: "00:00:00",
    end: "11:59:59",
    range: "00:00–11:59",
    emptyLabel: "Nada pela manhã.",
  },
  {
    id: "afternoon",
    title: "Tarde",
    start: "12:00:00",
    end: "17:59:59",
    range: "12:00–17:59",
    emptyLabel: "Nada à tarde.",
  },
  {
    id: "night",
    title: "Noite",
    start: "18:00:00",
    end: "23:59:59",
    range: "18:00–23:59",
    emptyLabel: "Nada à noite.",
  },
];

export function getTasksForPeriod(
  tasks: Task[],
  start: string,
  end: string
): Task[] {
  return tasks
    .filter((task) => task.startTime >= start && task.startTime <= end)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function groupTasksByPeriod(
  tasks: Task[]
): Array<TaskPeriod & { tasks: Task[] }> {
  return TASK_PERIODS.map((period) => ({
    ...period,
    tasks: getTasksForPeriod(tasks, period.start, period.end),
  }));
}

function sortByStartTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Descrição do PageHeader de /tasks, calculada da mesma lista `tasks[]` que
 * alimenta as seções (fonte única, SPEC §11.1).
 */
export function describeDay(tasks: Task[]): string {
  if (tasks.length === 0) return "Nenhuma tarefa";

  const concluded = tasks.filter((task) => task.status === "CONCLUDED").length;
  const onDoing = tasks.filter((task) => task.status === "ON_DOING").length;
  const parts = [`${concluded} de ${tasks.length} concluídas`];

  if (onDoing > 0) {
    parts.push(`${onDoing} em andamento`);
  }

  const next = sortByStartTime(
    tasks.filter((task) => task.status !== "CONCLUDED")
  )[0];

  if (next) {
    parts.push(`próxima às ${next.startTime.slice(0, 5)} — ${next.title}`);
  } else {
    parts.push("Tudo concluído");
  }

  return parts.join(" · ");
}

/** Descrição da visão semanal (SPEC §11.2). */
export function describeWeek(tasks: Task[]): string {
  if (tasks.length === 0) return "Nenhuma tarefa nesta semana";

  const concluded = tasks.filter((task) => task.status === "CONCLUDED").length;
  return `${concluded} de ${tasks.length} concluídas nesta semana`;
}
