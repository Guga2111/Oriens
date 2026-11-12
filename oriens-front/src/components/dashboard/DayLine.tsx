import { useEffect, useState } from "react";
import { isSameDay } from "date-fns";
import { TASK_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

const DAY_START_MINUTES = 6 * 60;
const DAY_END_MINUTES = 24 * 60;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function positionFor(time: string): number {
  const minutes = timeToMinutes(time);
  if (minutes <= DAY_START_MINUTES) return 0;
  if (minutes >= DAY_END_MINUTES) return 100;
  return ((minutes - DAY_START_MINUTES) / (DAY_END_MINUTES - DAY_START_MINUTES)) * 100;
}

interface DayLineProps {
  tasks: Task[];
  date: Date;
}

/**
 * Faixa de 06h a 24h com uma marca por tarefa (SPEC §11.1). Cada marca é um
 * `<button>` que rola até a linha da tarefa e a foca. A linha "agora" só
 * aparece quando a data é a de hoje; abaixo de 640 px a faixa fica oculta.
 */
export function DayLine({ tasks, date }: DayLineProps) {
  const isToday = isSameDay(date, new Date());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isToday) return;
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, [isToday]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPosition =
    isToday && nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES
      ? ((nowMinutes - DAY_START_MINUTES) /
          (DAY_END_MINUTES - DAY_START_MINUTES)) *
        100
      : null;

  const focusTask = (taskId: number) => {
    const row = document.getElementById(`task-row-${taskId}`);
    if (!row) return;
    row.scrollIntoView?.({ behavior: "smooth", block: "center" });
    row.focus({ preventScroll: true });
  };

  return (
    <div
      role="list"
      aria-label="Linha do dia"
      className="relative mt-6 hidden h-16 overflow-hidden rounded-lg border bg-card sm:block"
    >
      <div aria-hidden className="absolute inset-0 grid grid-cols-3">
        <div className="bg-muted/40" />
        <div className="bg-muted/20" />
        <div className="bg-muted/40" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1 grid grid-cols-3 text-center text-[11px] uppercase tracking-wide text-muted-foreground"
      >
        <span>Manhã</span>
        <span>Tarde</span>
        <span>Noite</span>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-between px-2 text-[11px] tabular-nums text-muted-foreground"
      >
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>

      {tasks.map((task) => {
        const position = positionFor(task.startTime);
        const beforeSix = timeToMinutes(task.startTime) < DAY_START_MINUTES;
        const status = TASK_STATUS[task.status];
        const timeLabel = beforeSix
          ? `≤06, ${task.startTime.slice(0, 5)}`
          : task.startTime.slice(0, 5);

        return (
          <button
            key={task.id}
            type="button"
            className="absolute top-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{
              left: `${position}%`,
              transform:
                position === 0
                  ? "translate(0, -50%)"
                  : position === 100
                    ? "translate(-100%, -50%)"
                    : "translate(-50%, -50%)",
            }}
            aria-label={`${timeLabel}, ${task.title}, ${status.label.toLowerCase()}`}
            title={`${timeLabel} · ${task.title}`}
            onClick={() => focusTask(task.id)}
          >
            <span
              aria-hidden
              className={cn(
                "h-4 w-1 rounded-full",
                task.status === "CONCLUDED"
                  ? "bg-primary"
                  : task.status === "ON_DOING"
                    ? "bg-now"
                    : "bg-foreground/40"
              )}
            />
          </button>
        );
      })}

      {nowPosition !== null && (
        <>
          <div
            aria-hidden
            className="absolute inset-y-0 z-20 w-0.5 bg-now"
            style={{ left: `${nowPosition}%` }}
          />
          <span
            aria-hidden
            className="absolute top-0 z-20 -translate-x-1/2 rounded bg-card px-1 text-[10px] font-medium text-foreground"
            style={{ left: `${Math.min(94, Math.max(6, nowPosition))}%` }}
          >
            agora
          </span>
        </>
      )}
    </div>
  );
}
