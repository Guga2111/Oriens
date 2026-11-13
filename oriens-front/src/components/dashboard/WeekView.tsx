import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TaskChip } from "@/components/dashboard/TaskChip";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

interface WeekViewProps {
  tasks: Task[];
  currentDate: Date;
  onUpdateTasks: () => void;
  onEditTask: (task: Task) => void;
  onSelectDay: (day: Date) => void;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function shortWeekday(day: Date): string {
  return capitalize(
    format(day, "EEEE", { locale: ptBR }).replace("-feira", "")
  );
}

/**
 * Visão semanal (SPEC §11.2). A partir de 1024 px mantém a grade de 7 colunas
 * que rola dentro do próprio container; abaixo disso vira uma agenda vertical
 * com os dias como `h2` e as tarefas como `TaskRow`.
 */
export function WeekView({
  tasks,
  currentDate,
  onUpdateTasks,
  onEditTask,
  onSelectDay,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const today = new Date();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const getTasksForDay = (day: Date) => {
    const formattedDay = format(day, "yyyy-MM-dd");
    return tasks
      .filter((task) => task.dueDate === formattedDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  if (!isDesktop) {
    return (
      <div role="region" aria-label="Agenda semanal" className="flex flex-col gap-6">
        {days.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isToday = isSameDay(day, today);
          const headingId = `agenda-${format(day, "yyyy-MM-dd")}`;
          const fullDate = format(day, "EEEE, d 'de' MMMM", {
            locale: ptBR,
          });

          return (
            <section key={headingId} aria-labelledby={headingId}>
              <div className="flex items-center gap-3 border-b pb-2">
                <h2 id={headingId} className="text-base font-semibold">
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    aria-label={`Ver ${fullDate}`}
                    aria-current={isToday ? "date" : undefined}
                    className="rounded-sm text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {shortWeekday(day)}, {format(day, "d")}
                  </button>
                </h2>
                {isToday && <Badge variant="warning">Hoje</Badge>}
              </div>

              {dayTasks.length > 0 ? (
                <ul className="mt-2 divide-y rounded-lg border bg-card">
                  {dayTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onUpdate={onUpdateTasks}
                      onEdit={onEditTask}
                    />
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  Sem tarefas
                </p>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Grade semanal"
      tabIndex={0}
      className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-[980px]">
        <div className="grid grid-cols-7 gap-3">
          {days.map((day) => {
            const dayTasks = getTasksForDay(day);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, currentDate);
            const fullDate = format(day, "EEEE, d 'de' MMMM", {
              locale: ptBR,
            });

            return (
              <div
                key={format(day, "yyyy-MM-dd")}
                className="flex min-w-0 flex-col gap-2"
              >
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-label={`Ver ${fullDate}`}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "relative rounded-md px-2 py-1.5 text-center transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected && "bg-muted"
                  )}
                >
                  {isToday && (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 top-0 h-0.5 bg-now"
                    />
                  )}
                  <span className="block text-xs capitalize text-muted-foreground">
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  <span
                    className={cn(
                      "block text-lg font-bold tabular-nums",
                      isToday && "font-semibold text-foreground"
                    )}
                  >
                    {format(day, "dd")}
                  </span>
                </button>

                <div className="flex flex-col gap-1.5">
                  {dayTasks.length > 0 ? (
                    dayTasks.map((task) => (
                      <TaskChip
                        key={task.id}
                        task={task}
                        onUpdate={onUpdateTasks}
                        onEdit={onEditTask}
                      />
                    ))
                  ) : (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      Sem tarefas
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
