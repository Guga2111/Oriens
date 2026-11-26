import { CalendarDays, CircleDot, Flag, Folder, Search, Tag } from "lucide-react";
import type { HeaderFilterSection } from "@/components/common/HeaderFilterPanel";
import { PRIORITY, PRIORITY_ORDER, TASK_STATUS } from "@/lib/labels";
import { TASK_STATUS_ORDER } from "@/lib/task-filters";
import { PriorityIcon } from "./PriorityIcon";
import { StatusIcon } from "./StatusIcon";
import { TaskFilterOptions, TaskFilterSearch, TaskLabelFilter, TaskPeriodFields, TaskProjectFilter, type TaskFilterProps } from "./TaskFilterFields";

export function taskFilterSections({ filters, onChange, showProject }: TaskFilterProps & { showProject?: boolean }): HeaderFilterSection[] {
  const sections: HeaderFilterSection[] = [
    { id: "status", icon: CircleDot, label: "Status", count: filters.status?.length,
      fields: <TaskFilterOptions label="Status" options={TASK_STATUS_ORDER} labels={TASK_STATUS}
        icon={status => <StatusIcon status={status} className="size-4" />}
        selected={filters.status ?? []} onChange={status => onChange({ status })} /> },
    { id: "priority", icon: Flag, label: "Prioridade", count: filters.priority?.length,
      fields: <TaskFilterOptions label="Prioridade" options={PRIORITY_ORDER} labels={PRIORITY}
        icon={priority => <PriorityIcon priority={priority} className="size-4 shrink-0" />}
        selected={filters.priority ?? []} onChange={priority => onChange({ priority })} /> },
    { id: "period", icon: CalendarDays, label: "Período", count: Number(!!(filters.startDate || filters.endDate)),
      fields: <TaskPeriodFields filters={filters} onChange={onChange} /> },
    { id: "label", icon: Tag, label: "Etiqueta", count: Number(!!filters.labelId),
      fields: <TaskLabelFilter value={filters.labelId} onChange={labelId => onChange({ labelId })} /> },
  ];

  if (showProject) {
    sections.push({ id: "project", icon: Folder, label: "Projeto", count: Number(!!filters.projectId),
      fields: <TaskProjectFilter value={filters.projectId} onChange={projectId => onChange({ projectId })} /> });
  }
  sections.push({ id: "search", icon: Search, label: "Busca", count: Number(!!filters.search),
    fields: <TaskFilterSearch value={filters.search ?? ""} onSubmit={search => onChange({ search })} /> });
  return sections;
}
