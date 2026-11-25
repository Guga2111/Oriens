import { useId } from "react";
import { format } from "date-fns";
import { WorkDatePicker } from "@/components/common/WorkDatePicker";
import { PriorityIcon } from "@/components/tasks/PriorityIcon";
import { StatusIcon } from "@/components/tasks/StatusIcon";
import { TaskLabels } from "@/components/tasks/TaskLabels";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PRIORITY, PRIORITY_ORDER, TASK_STATUS } from "@/lib/labels";
import { parseLocalDate } from "@/lib/date";
import { Status, type Priority, type TaskDTO, type TaskPriority, type TaskStatus } from "@/types/task";
import { ExploreList, ExploreResults, ExploreTable, type ExplorePage } from "./ExploreResults";
import { ExploreSortHead, ExploreSortMenu, type ExploreSortColumn, type ExploreSorting } from "./ExploreSort";
import { ProjectFilter } from "./ProjectFilter";

export interface TasksFilters {
  dateField: "plannedDate" | "dueDate";
  projectId?: number;
  status: Status | "all";
  priority: Priority | "all";
  searchQuery: string;
  startDate?: Date;
  endDate?: Date;
}

export type TaskSortField = "title" | "status" | "priority" | "plannedDate" | "dueDate" | "startTime";

const TASK_COLUMNS: readonly ExploreSortColumn<TaskSortField>[] = [
  { field: "title", label: "Tarefa" },
  { field: "status", label: "Status", className: "w-32" },
  { field: "priority", label: "Prioridade", className: "w-32", firstDirection: "DESC" },
  { field: "plannedDate", label: "Planejada para", className: "w-36" },
  { field: "dueDate", label: "Prazo final", className: "w-28" },
  { field: "startTime", label: "Horário", className: "w-24" },
];

const FILTER_STATUSES = [Status.BACKLOG, Status.PENDING, Status.ON_DOING, Status.CANCELLED, Status.CONCLUDED];

interface TasksDataTableProps {
  tasks: TaskDTO[];
  isLoading: boolean;
  pagination: ExplorePage;
  onPageChange: (page: number) => void;
  filters: TasksFilters;
  sorting: ExploreSorting<TaskSortField>;
  onFilterChange: (filters: Partial<TasksFilters>) => void;
  onClearFilters: () => void;
  feedback?: { error: unknown; retry: () => void };
}

export function TasksDataTable({ tasks, isLoading, pagination, onPageChange, filters, onFilterChange, onClearFilters, feedback, sorting }: TasksDataTableProps) {
  const filterCount = Number(filters.projectId !== undefined) + Number(filters.status !== "all")
    + Number(filters.priority !== "all") + Number(Boolean(filters.startDate || filters.endDate || filters.dateField !== "plannedDate"));

  return (
    <ExploreResults resources="tarefas" emptyTitle="Nenhuma tarefa encontrada" emptyDescription="As tarefas criadas aparecerão aqui."
      isLoading={isLoading} hasRows={tasks.length > 0} pagination={pagination} onPageChange={onPageChange} feedback={feedback}
      search={{ query: filters.searchQuery, submit: searchQuery => onFilterChange({ searchQuery }) }}
      filters={{
        count: filterCount,
        clear: onClearFilters,
        fields: <TaskFilterFields filters={filters} onChange={onFilterChange} />,
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
      {task.description && <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
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

function TaskFilterFields({ filters, onChange }: { filters: TasksFilters; onChange: (update: Partial<TasksFilters>) => void }) {
  const id = useId();
  return (
    <FieldGroup className="gap-3">
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-project`}>Projeto</FieldLabel>
        <ProjectFilter id={`${id}-project`} value={filters.projectId} onChange={projectId => onChange({ projectId })} />
      </Field>
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-status`}>Status</FieldLabel>
        <Select value={filters.status} onValueChange={(status: TasksFilters["status"]) => onChange({ status })}>
          <SelectTrigger id={`${id}-status`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todos os status</SelectItem>
              {FILTER_STATUSES.map(status => <SelectItem key={status} value={status}>{TASK_STATUS[status].label}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-priority`}>Prioridade</FieldLabel>
        <Select value={filters.priority} onValueChange={(priority: TasksFilters["priority"]) => onChange({ priority })}>
          <SelectTrigger id={`${id}-priority`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {PRIORITY_ORDER.map(priority => <SelectItem key={priority} value={priority}>{PRIORITY[priority].label}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-date-field`}>Campo de data</FieldLabel>
        <Select value={filters.dateField} onValueChange={(dateField: TasksFilters["dateField"]) => onChange({ dateField })}>
          <SelectTrigger id={`${id}-date-field`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="plannedDate">Planejada para</SelectItem>
              <SelectItem value="dueDate">Prazo final</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-start-date`}>Data inicial</FieldLabel>
        <WorkDatePicker id={`${id}-start-date`} label="Data inicial" value={filters.startDate ? format(filters.startDate, "yyyy-MM-dd") : ""}
          onChange={value => onChange({ startDate: parseLocalDate(value) })} />
      </Field>
      <Field className="gap-1.5">
        <FieldLabel htmlFor={`${id}-end-date`}>Data final</FieldLabel>
        <WorkDatePicker id={`${id}-end-date`} label="Data final" value={filters.endDate ? format(filters.endDate, "yyyy-MM-dd") : ""}
          onChange={value => onChange({ endDate: parseLocalDate(value) })} />
      </Field>
    </FieldGroup>
  );
}
