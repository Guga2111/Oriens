import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskRow } from "@/components/dashboard/TaskRow";
import type { Task } from "@/types/task";

interface TaskSectionProps {
  title: string;
  timeRange: string;
  emptyLabel: string;
  tasks: Task[];
  onUpdateTasks: () => void;
  onEditTask: (task: Task) => void;
  onAddTask: () => void;
  isLoading?: boolean;
}

/**
 * Seção de período da visão dia (SPEC §11.1): cabeçalho em texto, intervalo,
 * contagem à direita e sem ícones coloridos.
 */
export function TaskSection({
  title,
  timeRange,
  emptyLabel,
  tasks,
  onUpdateTasks,
  onEditTask,
  onAddTask,
  isLoading = false,
}: TaskSectionProps) {
  const headingId = `period-${title.toLowerCase()}`;
  const concludedCount = tasks.filter(
    (task) => task.status === "CONCLUDED"
  ).length;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex items-baseline justify-between gap-3 border-b pb-2">
        <div>
          <h2 id={headingId} className="text-base font-semibold">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{timeRange}</p>
        </div>
        <p className="text-sm font-medium tabular-nums text-muted-foreground">
          {concludedCount} de {tasks.length}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-3" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : tasks.length > 0 ? (
        <ul role="list">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onUpdate={onUpdateTasks}
              onEdit={onEditTask}
            />
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3 py-3 text-sm text-muted-foreground">
          <span>{emptyLabel}</span>
          <Button variant="ghost" size="sm" className="max-md:h-10" onClick={onAddTask}>
            Adicionar
          </Button>
        </div>
      )}
    </section>
  );
}
