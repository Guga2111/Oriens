import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, Clock, Flag, MoreHorizontal, Pencil, Trash2, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { BoardTaskProperties } from '@/components/dashboard/TaskProperties';
import { TaskLabels } from '@/components/tasks/TaskLabels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDue } from '@/lib/date';
import { PRIORITY } from '@/lib/labels';
import { isTaskOverdue } from '@/lib/tasks';
import { cn } from '@/lib/utils';
import { statusNames } from '@/lib/work-form';
import type { BoardResponse, WorkTask } from '@/types/work';

type Column = BoardResponse['columns'][number];
type Move = (task: WorkTask, columnId: number, beforeTaskId?: number | null) => Promise<void>;

const cardClass = 'relative min-w-0 rounded-xl border bg-card p-3 transition-colors motion-reduce:transition-none hover:bg-accent/40';
const titleClass = "h-auto w-full justify-start whitespace-normal p-0 text-left text-sm font-medium after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:bg-transparent active:transform-none";
const menuClass = 'size-7';

function DesktopTaskCard({ task, today, title, menu }: { task: WorkTask; today: string; title: ReactNode; menu: ReactNode }) {
  return <>
    <div className="mb-1 flex items-center justify-between gap-2">
      <span className="text-xs tabular-nums text-muted-foreground">#{task.id}</span>
      <div className="relative z-10" data-board-control>{menu}</div>
    </div>
    {title}
    <div className="pointer-events-none relative z-10 mt-3 flex min-w-0 gap-1.5 overflow-x-auto [&>*]:pointer-events-auto" data-board-control>
      <BoardTaskProperties task={task} today={today} />
    </div>
  </>;
}

export function BoardTaskOverlay({ task, today }: { task: WorkTask; today: string }) {
  return <article className={cardClass} aria-hidden>
    <DesktopTaskCard task={task} today={today}
      title={<Button asChild variant="ghost" className={titleClass}><span>{task.title}</span></Button>}
      menu={<Button asChild variant="ghost" size="icon" className={menuClass}><span><MoreHorizontal aria-hidden /></span></Button>} />
  </article>;
}

export function BoardTask({ task, column, columns, above, below, afterBelow, filtered, busy, today, mobile, reducedMotion, menuDisabled, pendingColumnId, onOpen, onEdit, onObjective, onDelete, move }: {
  task: WorkTask; column: Column; columns: Column[]; above?: WorkTask; below?: WorkTask; afterBelow?: WorkTask;
  filtered: boolean; busy: boolean; today: string; mobile: boolean; reducedMotion: boolean; menuDisabled: boolean; pendingColumnId: number;
  onOpen: (task: WorkTask) => void; onEdit: (task: WorkTask) => void; onObjective: (id: number) => void; onDelete: (task: WorkTask) => void; move: Move;
}) {
  // Keep a saving card as a drop target for other tasks.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: { draggable: busy || mobile, droppable: mobile },
    transition: reducedMotion ? null : undefined,
  });
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Ações da tarefa ${task.title}`}
          disabled={busy || menuDisabled} className={mobile ? undefined : menuClass}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onEdit(task)}><Pencil aria-hidden />Editar tarefa</DropdownMenuItem>
          <DropdownMenuLabel>Mover para…</DropdownMenuLabel>
          {columns.filter(destination => destination.id !== column.id).map(destination => (
            <DropdownMenuItem key={destination.id} onSelect={() => void move(task, destination.id)}>
              <ArrowRight aria-hidden />{destination.name} · {statusNames[destination.kind]}
            </DropdownMenuItem>
          ))}
          {!filtered && above && <DropdownMenuItem onSelect={() => void move(task, column.id, above.id)}><ArrowUp aria-hidden />Mover acima</DropdownMenuItem>}
          {!filtered && below && <DropdownMenuItem onSelect={() => void move(task, column.id, afterBelow?.id ?? null)}><ArrowDown aria-hidden />Mover abaixo</DropdownMenuItem>}
          {task.status === 'CANCELLED' && <DropdownMenuItem onSelect={() => void move(task, pendingColumnId)}><Undo2 aria-hidden />Reabrir tarefa</DropdownMenuItem>}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(task)}>
          <Trash2 aria-hidden />Excluir tarefa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const title = (
    <Button ref={setActivatorNodeRef} {...(!mobile && attributes)} aria-disabled={undefined}
      onKeyDown={event => listeners?.onKeyDown?.(event)} type="button" variant="ghost" className={cn(titleClass, mobile && 'min-h-10')}
      data-board-task-title={task.id} aria-haspopup="dialog" onClick={() => onOpen(task)}>{task.title}</Button>
  );

  return <article ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}
    className={cn(cardClass, !mobile && !busy && 'cursor-grab touch-none active:cursor-grabbing', isDragging && 'opacity-40')}
    aria-busy={busy}
    onPointerDown={event => {
      if (!(event.target instanceof Element) || !event.currentTarget.contains(event.target) || event.target.closest('[data-board-control]')) return;
      listeners?.onPointerDown?.(event);
    }}>
    {mobile
      ? <MobileTaskCard task={task} today={today} title={title} menu={menu} onObjective={onObjective} />
      : <DesktopTaskCard task={task} today={today} title={title} menu={menu} />}
  </article>;
}

// The compact viewport continues to show the detailed card in its single selected column.
function MobileTaskCard({ task, today, title, menu, onObjective }: {
  task: WorkTask; today: string; title: ReactNode; menu: ReactNode; onObjective: (id: number) => void;
}) {
  const overdue = isTaskOverdue(task, today);
  return <>
    <div className="mb-2 flex items-center justify-between gap-2">
      <Badge variant={PRIORITY[task.priority].badge}>{PRIORITY[task.priority].label}</Badge>
      <div className="relative z-10 flex items-center">{menu}</div>
    </div>
    <TaskLabels labels={task.labels} />
    {title}
    {(task.descriptionText ?? task.description) && <p className="line-clamp-2 break-words text-xs text-muted-foreground">{task.descriptionText ?? task.description}</p>}
    {task.objective && <Button variant="link" className="relative z-10 mt-1 h-auto min-h-10 w-full justify-start whitespace-normal px-0 text-left" onClick={() => onObjective(task.objectiveId!)}>{task.objective.title}</Button>}
    <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
      <p className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0" aria-hidden />{task.plannedDate ? `Planejada: ${formatDue(task.plannedDate)}` : 'Sem planejamento'}{task.startTime && <><Clock className="size-3 shrink-0" aria-hidden />{task.startTime.slice(0, 5)}</>}</p>
      {task.dueDate && <p className={cn('flex items-center gap-2', overdue && 'text-negative')}><Flag className="size-4 shrink-0" aria-hidden />Prazo: {formatDue(task.dueDate)}{overdue ? ' · Ultrapassado' : ''}</p>}
      {task.completedAt && <p>Concluída em {formatDue(task.completedAt)}</p>}
    </div>
  </>;
}
