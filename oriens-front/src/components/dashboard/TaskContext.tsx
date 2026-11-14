import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { productNow } from '@/lib/product-time';
import type { Task } from '@/types/task';

export function TaskContext({ task, compact = false }: { task: Task; compact?: boolean }) {
  const active = task.status === 'PENDING' || task.status === 'ON_DOING';
  const today = productNow().date;
  const date = (value: string) => format(parseISO(value), 'dd/MM/yyyy');
  return <div className="mt-1 space-y-1 break-words text-sm text-muted-foreground">
    {task.project && <p><Link className="underline underline-offset-2" to={`/tasks/project/${task.project.id}`}>{task.project.title}</Link>{task.column && ` · ${task.column.name}`}{task.project.archived && ' · Projeto arquivado'}</p>}
    {task.project && task.objective && <p className={compact ? "line-clamp-2" : undefined} title={task.objective.title}><Link className="underline underline-offset-2" to={`/tasks/project/${task.project.id}?tab=objectives#objective-${task.objective.id}`}>{task.objective.title}</Link></p>}
    <div className="flex flex-wrap gap-x-3 gap-y-1">{!compact && <p>{task.plannedDate ? `Planejada para ${date(task.plannedDate)}` : 'Sem planejamento'}</p>}
    {task.dueDate && <p className={active && task.dueDate < today ? 'text-negative' : undefined}>{active && task.dueDate < today ? 'Prazo ultrapassado: ' : active && task.dueDate === today ? 'Prazo termina hoje: ' : 'Prazo: '}{date(task.dueDate)}</p>}</div>
  </div>;
}
