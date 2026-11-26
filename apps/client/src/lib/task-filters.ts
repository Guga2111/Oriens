import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import { validCalendarDate } from "@/lib/work-form";
import { productDate } from "@/lib/product-time";
import { PRIORITY_ORDER, TASK_STATUS } from "@/lib/labels";
import type { TaskPriority, TaskStatus } from "@/types/task";

export interface TaskFilters {
  projectId?: number;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  labelId?: number;
  search?: string;
  dateField?: "plannedDate" | "dueDate";
  startDate?: string;
  endDate?: string;
}

export const TASK_STATUS_ORDER = Object.keys(TASK_STATUS) as TaskStatus[];

export function activeTaskFilterCount(filters: TaskFilters) {
  return Number(!!filters.projectId) + Number(!!filters.status?.length) + Number(!!filters.priority?.length)
    + Number(!!filters.labelId) + Number(!!filters.search) + Number(!!(filters.startDate || filters.endDate));
}

export type TaskFilterQuery = Omit<TaskFilters, "status" | "priority"> & {
  status?: string;
  priority?: string;
};

export function taskFilterQuery({ status, priority, dateField, startDate, endDate, ...filters }: TaskFilters): TaskFilterQuery {
  return {
    ...(filters.projectId && { projectId: filters.projectId }),
    ...(filters.search && { search: filters.search }),
    ...(filters.labelId && { labelId: filters.labelId }),
    ...(status?.length && { status: status.join(",") }),
    ...(priority?.length && { priority: priority.join(",") }),
    ...((startDate || endDate) && { dateField: dateField ?? "plannedDate" }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };
}

export function taskPeriodPresets(today: string) {
  const date = productDate(today);
  return [
    { value: "last7", label: "Últimos 7 dias", startDate: format(subDays(date, 6), "yyyy-MM-dd"), endDate: today },
    { value: "last30", label: "Últimos 30 dias", startDate: format(subDays(date, 29), "yyyy-MM-dd"), endDate: today },
    { value: "month", label: "Este mês", startDate: format(startOfMonth(date), "yyyy-MM-dd"), endDate: format(endOfMonth(date), "yyyy-MM-dd") },
  ];
}

export function taskFiltersFromParams(params: URLSearchParams): TaskFilters {
  const status = params.get("status")?.split(",");
  const priority = params.get("priority")?.split(",");
  const labelId = Number(params.get("labelId"));
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  return {
    status: TASK_STATUS_ORDER.filter(value => status?.includes(value)),
    priority: PRIORITY_ORDER.filter(value => priority?.includes(value)),
    labelId: Number.isSafeInteger(labelId) && labelId > 0 ? labelId : undefined,
    search: params.get("search")?.trim() || undefined,
    dateField: params.get("dateField") === "dueDate" ? "dueDate" : "plannedDate",
    startDate: startDate && validCalendarDate(startDate) ? startDate : undefined,
    endDate: endDate && validCalendarDate(endDate) ? endDate : undefined,
  };
}
