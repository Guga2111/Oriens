import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { productNow } from "@/lib/product-time";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
 * aparece quando a data é a de hoje. Abaixo de 640 px vira uma faixa compacta
 * de 40 px, só com marcas e a linha "agora" (SPEC §11.1).
 */
export function DayLine({ tasks, date }: DayLineProps) {
  const selectedTask = useRef<number | null>(null);
  const [now, setNow] = useState(() => productNow());
  const isToday = format(date, "yyyy-MM-dd") === now.date;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(productNow()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const nowMinutes = timeToMinutes(now.time);
  const nowPosition =
    isToday && nowMinutes >= DAY_START_MINUTES && nowMinutes <= DAY_END_MINUTES
      ? ((nowMinutes - DAY_START_MINUTES) /
          (DAY_END_MINUTES - DAY_START_MINUTES)) *
        100
      : null;

  const focusTask = (taskId: number) => {
    const row = document.getElementById(`task-row-${taskId}`);
    if (!row) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView?.({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    row.focus({ preventScroll: true });
  };

  return (
    <div
      role="list"
      aria-label="Linha do dia"
      className="relative mt-6 h-11 overflow-hidden rounded-lg border bg-card sm:h-16"
    >
      <div aria-hidden className="absolute inset-0 grid grid-cols-3">
        <div className="bg-muted/40" />
        <div className="bg-muted/20" />
        <div className="bg-muted/40" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1 hidden grid-cols-3 text-center text-xs text-muted-foreground sm:grid"
      >
        <span>Manhã</span>
        <span>Tarde</span>
        <span>Noite</span>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-1 hidden justify-between px-2 text-xs tabular-nums text-muted-foreground sm:flex"
      >
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>

      {Object.entries(tasks.filter(t => t.startTime && t.status !== 'CANCELLED').reduce<Record<string, Task[]>>((groups, task) => {
        // The clamped pre-06 range is one position too, so its targets must share a menu.
        const key = timeToMinutes(task.startTime!) <= DAY_START_MINUTES ? '06:00' : task.startTime!.slice(0, 5);
        (groups[key] ??= []).push(task); return groups;
      }, {})).map(([minute, group]) => {
        const position = positionFor(minute);
        const task = group[0];
        const label = (t: Task) => `${t.startTime!.slice(0, 5)}, ${t.title}, ${TASK_STATUS[t.status].label.toLowerCase()}`;
        // eslint-disable-next-line no-restricted-syntax -- shadcn-exception: timeline marker positioned by runtime left/transform; Button padding, gap and active scale would displace it
        const marker = <button type="button" className="absolute top-1/2 z-10 flex h-11 min-w-11 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ left: `${position}%`, transform: position === 0 ? 'translate(0, -50%)' : position === 100 ? 'translate(-100%, -50%)' : 'translate(-50%, -50%)' }}
          aria-label={group.length > 1 ? `${minute}, ${group.length} tarefas` : label(task)} title={group.map(label).join(' · ')}
          onClick={group.length === 1 ? () => focusTask(task.id) : undefined}>
          <span aria-hidden className={cn('h-4 w-1 rounded-full', task.status === 'CONCLUDED' ? 'bg-muted-foreground' : task.status === 'ON_DOING' ? 'bg-primary' : 'bg-foreground/40')} />
          {group.length > 1 && <span className="ml-1 text-xs tabular-nums">{group.length}</span>}
        </button>;
        return group.length === 1 ? <span key={minute}>{marker}</span> : <DropdownMenu key={minute}><DropdownMenuTrigger asChild>{marker}</DropdownMenuTrigger><DropdownMenuContent className="max-sm:[&_[role=menuitem]]:min-h-11" onCloseAutoFocus={e => { if (selectedTask.current !== null) { e.preventDefault(); focusTask(selectedTask.current); selectedTask.current = null; } }}>{group.map(t => <DropdownMenuItem key={t.id} onSelect={() => { selectedTask.current = t.id; }}>{label(t)}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
      })}

      {nowPosition !== null && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-now"
            style={{ left: `${nowPosition}%` }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 z-20 hidden -translate-x-1/2 rounded bg-card px-1 text-xs font-medium text-foreground sm:block"
            style={{ left: `${Math.min(94, Math.max(6, nowPosition))}%` }}
          >
            agora
          </span>
        </>
      )}
    </div>
  );
}
