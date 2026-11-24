import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskRow } from "@/components/dashboard/TaskRow";
import type { Task } from "@/types/task";

interface TaskSectionProps {
  title: string;
  timeRange?: string;
  emptyLabel: string;
  tasks: Task[];
  onUpdateTasks: () => void;
  onEditTask: (task: Task) => void;
  onAddTask?: () => void;
  onOpenTask?: (task: Task) => void;
  isLoading?: boolean;
}

/**
 * Seção de período da visão dia (SPEC §11.1): cabeçalho em texto, intervalo,
 * contagem à direita e sem ícones coloridos. O título recolhe e expande a lista.
 */
export function TaskSection({
  title,
  timeRange,
  emptyLabel,
  tasks,
  onUpdateTasks,
  onEditTask,
  onAddTask,
  onOpenTask,
  isLoading = false,
}: TaskSectionProps) {
  const headingId = `period-${title.toLowerCase()}`;

  return (
    <Collapsible defaultOpen asChild>
      <section aria-labelledby={headingId} className="group/section">
        <div className="mb-2 flex items-baseline justify-between gap-3 border-b pb-2">
          <div>
            <h2 id={headingId} className="text-base font-medium">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="h-auto justify-start gap-1 p-0 text-base font-medium hover:bg-transparent max-md:min-h-10">
                  <ChevronDown aria-hidden className="text-muted-foreground transition-transform group-data-[state=closed]/section:-rotate-90 motion-reduce:transition-none" />
                  {title}
                </Button>
              </CollapsibleTrigger>
            </h2>
            {timeRange && <p className="pl-5 text-xs text-muted-foreground">{timeRange}</p>}
          </div>
          <p className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
          </p>
        </div>

        <CollapsibleContent>
          {isLoading ? (
            <div className="flex flex-col gap-3 py-3" aria-hidden>
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
                  onOpen={onOpenTask}
                />
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 py-3 text-sm text-muted-foreground">
              <span>{emptyLabel}</span>
              {onAddTask && <Button variant="ghost" size="sm" className="max-md:h-11" onClick={onAddTask}>
                Adicionar
              </Button>}
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
