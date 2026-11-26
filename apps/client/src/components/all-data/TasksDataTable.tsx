import { format } from "date-fns";
import { TaskFilterFields } from "@/components/tasks/TaskFilterFields";
import { PriorityIcon } from "@/components/tasks/PriorityIcon";
import { StatusIcon } from "@/components/tasks/StatusIcon";
import { TaskLabels } from "@/components/tasks/TaskLabels";
import { TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PRIORITY, TASK_STATUS } from "@/lib/labels";
import { parseLocalDate } from "@/lib/date";
import { activeTaskFilterCount, type TaskFilters } from "@/lib/task-filters";
import type { TaskDTO, TaskPriority, TaskStatus } from "@/types/task";
import { ExploreList, ExploreResults, ExploreTable, type ExplorePage } from "./ExploreResults";
import { ExploreSortHead, ExploreSortMenu, type ExploreSortColumn, type ExploreSorting } from "./ExploreSort";

export type TaskSortField = "title" | "status" | "priority" | "plannedDate" | "dueDate" | "startTime";

const TASK_COLUMNS: readonly ExploreSortColumn<TaskSortField>[] = [
  { field: "title", label: "Tarefa" },
  { field: "status", label: "Status", className: "w-32" },
  { field: "priority", label: "Prioridade", className: "w-32", firstDirection: "DESC" },
  { field: "plannedDate", label: "Planejada para", className: "w-36" },
  { field: "dueDate", label: "Prazo final", className: "w-28" },
  { field: "startTime", label: "Horário", className: "w-24" },
];


interface TasksDataTableProps {
  tasks: TaskDTO[];
  isLoading: boolean;
  pagination: ExplorePage;
  onPageChange: (page: number) => void;
  filters: TaskFilters;
  sorting: ExploreSorting<TaskSortField>;
  onFilterChange: (filters: Partial<TaskFilters>) => void;
  onClearFilters: () => void;
  feedback?: { error: unknown; retry: () => void };
}

export function TasksDataTable({ tasks, isLoading, pagination, onPageChange, filters, onFilterChange, onClearFilters, feedback, sorting }: TasksDataTableProps) {
  return (
    <ExploreResults resources="tarefas" emptyTitle="Nenhuma tarefa encontrada" emptyDescription="As tarefas criadas aparecerão aqui."
      isLoading={isLoading} hasRows={tasks.length > 0} pagination={pagination} onPageChange={onPageChange} feedback={feedback}
      search={{ query: filters.search ?? "", inputLabel: "Buscar por título ou descrição", submit: search => onFilterChange({ search: search.trim() }) }}
      filters={{
        count: activeTaskFilterCount({ ...filters, search: undefined }),
        clear: onClearFilters,
        fields: <TaskFilterFields showProject filters={filters} onChange={onFilterChange} />,
      }}>
      <ExploreTable label="Tarefas">
        <TableHeader>
          <TableRow>
            {TASK_COLUMNS.map(column => <ExploreSortHead key={column.field} column={column} sorting={sorting} />)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell><TaskIdentity task={task} /></TableCell>
              <TableCell className="text-xs"><TaskStatusValue status={task.status} /></TableCell>
              <TableCell className="text-xs"><TaskPriorityValue priority={task.priority} /></TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{dateLabel(task.plannedDate)}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{dateLabel(task.dueDate)}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{task.startTime?.slice(0, 5) || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </ExploreTable>

      <ExploreList label="Lista de tarefas" ordering={<ExploreSortMenu columns={TASK_COLUMNS} sorting={sorting} />}>
        {tasks.map(task => (
          <li key={task.id} className="flex min-w-0 flex-col gap-2 px-3 py-3">
            <TaskIdentity task={task} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <TaskStatusValue status={task.status} />
              <TaskPriorityValue priority={task.priority} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
              <span>Planejada para {dateLabel(task.plannedDate)}</span>
              <span>Prazo final {dateLabel(task.dueDate)}</span>
              {task.startTime && <span>Horário {task.startTime.slice(0, 5)}</span>}
            </div>
          </li>
        ))}
      </ExploreList>
    </ExploreResults>
  );
}

function TaskIdentity({ task }: { task: TaskDTO }) {
  return (
    <div className="min-w-0 break-words">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <p className="min-w-0 max-w-full font-medium">{task.title}</p>
        <TaskLabels labels={task.labels} inline />
      </div>
      {(task.descriptionText ?? task.description) && <p className="line-clamp-2 text-xs text-muted-foreground">{task.descriptionText ?? task.description}</p>}
    </div>
  );
}

function TaskStatusValue({ status }: { status: TaskStatus }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><StatusIcon status={status} className="size-3.5" />{TASK_STATUS[status].label}</span>;
}

function TaskPriorityValue({ priority }: { priority: TaskPriority }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><PriorityIcon priority={priority} className="size-3.5 shrink-0" />{PRIORITY[priority].label}</span>;
}

function dateLabel(value?: string | null) {
  const date = parseLocalDate(value);
  return date ? format(date, "dd/MM/yyyy") : "—";
}
