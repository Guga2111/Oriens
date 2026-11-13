import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TaskChip } from "@/components/dashboard/TaskChip";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

interface WeekViewProps {
  tasks: Task[];
  currentDate: Date;
  onUpdateTasks: () => void;
  onEditTask: (task: Task) => void;
  onSelectDay: (day: Date) => void;
}

/**
 * Grade semanal de 7 colunas (SPEC §11.2). Em qualquer largura abaixo de
 * 1280 px a grade mantém a largura mínima e rola dentro deste container,
 * nunca na página.
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

  const getTasksForDay = (day: Date) => {
    const formattedDay = format(day, "yyyy-MM-dd");
    return tasks
      .filter((task) => task.dueDate === formattedDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <div
      role="region"
      aria-label="Grade semanal"
      tabIndex={0}
      className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-[980px]">
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, index) => {
            const day = addDays(weekStart, index);
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
