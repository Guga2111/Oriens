import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { Task } from '@/types/task';

export function TaskPlanningMenu({ task, onEdit, onPlan }: { task: Task; onEdit: (task: Task) => void; onPlan: (today: boolean) => void }) {
  return <>
    <DropdownMenuItem onSelect={() => onPlan(true)}>Fazer hoje</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => onEdit(task)}>{task.plannedDate ? 'Reagendar' : 'Planejar'}</DropdownMenuItem>
    {task.plannedDate && <DropdownMenuItem onSelect={() => onPlan(false)}>Retirar do planejamento</DropdownMenuItem>}
  </>;
}
