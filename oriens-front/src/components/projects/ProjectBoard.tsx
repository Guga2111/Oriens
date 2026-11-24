import { TaskLabels } from '@/components/tasks/TaskLabels';
import { useRef, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, pointerWithin, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, Clock, Flag, GripVertical, MoreHorizontal, Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusIcon } from '@/components/tasks/StatusIcon';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WorkSelect } from '@/components/common/WorkSelect';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useTaskWrites } from '@/hooks/useWork';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { formatDue } from '@/lib/date';
import { productNow } from '@/lib/product-time';
import { isTaskOverdue } from '@/lib/tasks';
import { statusNames } from '@/lib/work-form';
import { PRIORITY } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { BoardResponse, WorkTask } from '@/types/work';

// Prefer the task under the pointer over its enclosing column. Outside drops cancel.
const boardCollision: CollisionDetection = args => {
  if (!args.pointerCoordinates) return closestCorners(args);
  const hits = pointerWithin(args);
  const tasks = hits.filter(hit => typeof hit.id === 'number');
  return tasks.length ? tasks : hits;
};

type Column = BoardResponse['columns'][number];
type Move = (task: WorkTask, columnId: number, beforeTaskId?: number | null) => Promise<void>;

export function ProjectBoard({ board, pendingColumnId, onOpen, onEdit, onAdd, onObjective }: {
  board: BoardResponse; pendingColumnId: number; onOpen: (task: WorkTask) => void; onEdit: (task: WorkTask) => void; onAdd: (column: number) => void; onObjective: (id: number) => void;
}) {
  const writes = useTaskWrites();
  const mobile = useMediaQuery('(max-width: 639px)');
  const [selected, setSelected] = useState(String(board.columns[0]?.id ?? ''));
  const [deleting, setDeleting] = useState<WorkTask | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [moving, setMoving] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const movingRef = useRef(false);
  const region = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const current = board.columns.some(c => String(c.id) === selected) ? selected : String(board.columns[0]?.id ?? '');
  const columns = mobile ? board.columns.filter(c => String(c.id) === current) : board.columns;
  async function move(task: WorkTask, columnId: number, beforeTaskId: number | null = null) {
    if (movingRef.current) return;
    movingRef.current = true;
    setMoving(task.id);
    try {
      const result = await writes.patch.mutateAsync({ id: task.id, body: { version: task.version, projectVersion: board.projectVersion, columnId, beforeTaskId } });
      setAnnouncement(result.refreshFailed ? 'Movimento salvo. Recarregue o quadro para atualizar.' : `Tarefa movida para ${board.columns.find(c => c.id === columnId)?.name}.`);
      if (mobile) setSelected(String(columnId));
      requestAnimationFrame(() => region.current?.focus());
    } catch { /* Keep the confirmed board and show the mutation error. */ }
    finally { movingRef.current = false; setMoving(null); }
  }
  function drop({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const task = board.tasks.find(t => t.id === active.id);
    const targetTask = board.tasks.find(t => t.id === over.id);
    const column = board.columns.find(c => `column-${c.id}` === over.id || c.id === targetTask?.columnId);
    if (!task || !column) return;
    if (task.columnId === column.id) {
      if (board.filtered) return;
      const rows = board.tasks.filter(t => t.columnId === column.id);
      const from = rows.findIndex(t => t.id === task.id);
      const to = targetTask ? rows.findIndex(t => t.id === targetTask.id) : rows.length - 1;
      if (from === to) return;
      const reordered = arrayMove(rows, from, to);
      void move(task, column.id, reordered[to + 1]?.id ?? null);
    } else {
      void move(task, column.id, board.filtered ? null : targetTask?.id ?? null);
    }
  }
  const activeTask = board.tasks.find(t => t.id === activeId);
  return <div className="min-w-0 max-sm:[&_button]:min-h-11" ref={region} tabIndex={-1} aria-label="Quadro de tarefas">
    <WorkFeedback error={writes.patch.error} />
    <p className="sr-only" role="status">{announcement}</p>
    {mobile && <div className="mb-4"><WorkSelect label="Coluna do quadro" value={current} onChange={setSelected} options={board.columns.map(c => ({ value: String(c.id), label: `${c.name} (${c.visibleCount})` }))} /></div>}
    <DndContext sensors={sensors} collisionDetection={boardCollision} onDragStart={({ active }) => setActiveId(Number(active.id))} onDragEnd={drop} onDragCancel={() => setActiveId(null)}
      accessibility={{ screenReaderInstructions: { draggable: 'Pressione espaço para pegar a tarefa, use as setas para mover, espaço para soltar ou Escape para cancelar.' },
        announcements: {
          onDragStart: ({ active }) => `Arrastando ${board.tasks.find(t => t.id === active.id)?.title}.`,
          onDragOver: ({ over }) => over ? `Destino: ${board.columns.find(c => `column-${c.id}` === over.id)?.name ?? board.tasks.find(t => t.id === over.id)?.title}.` : 'Fora do quadro.',
          onDragEnd: () => 'Arraste finalizado.', onDragCancel: () => 'Movimento cancelado.',
        } }}>
      <ScrollArea orientation="horizontal" className="w-full">
        <div className="flex min-w-0 gap-4 pb-4" aria-label="Colunas do quadro">
          {columns.map(column => <BoardColumn key={column.id} column={column} filtered={board.filtered} disabled={moving !== null} mobile={mobile} onAdd={onAdd}>
            <SortableContext items={board.tasks.filter(t => t.columnId === column.id).map(t => t.id)} strategy={verticalListSortingStrategy}>
              {board.tasks.filter(t => t.columnId === column.id).map((task, index, tasks) => <BoardTask key={task.id} task={task} column={column} columns={board.columns} tasks={tasks} index={index} filtered={board.filtered} disabled={moving !== null} busy={moving === task.id} mobile={mobile} pendingColumnId={pendingColumnId} onOpen={onOpen} onEdit={onEdit} onObjective={onObjective} onDelete={setDeleting} move={move} />)}
            </SortableContext>
          </BoardColumn>)}
        </div>
      </ScrollArea>
      <DragOverlay>{activeTask && <div className="w-board-column rounded-xl border bg-card p-3 text-sm font-medium shadow-lg">{activeTask.title}</div>}</DragOverlay>
    </DndContext>
    <ConfirmDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }} title="Excluir tarefa?" objectName={deleting?.title ?? ''} confirmLabel="Excluir tarefa" error={writes.remove.error}
      onConfirm={async () => {
        if (!deleting) return false;
        try { const result = await writes.remove.mutateAsync(deleting); setAnnouncement(result.refreshFailed ? 'Tarefa excluída. Recarregue o quadro.' : 'Tarefa excluída.'); region.current?.focus(); return true; }
        catch { return false; }
      }} />
  </div>;
}

function BoardColumn({ column, filtered, disabled, mobile, onAdd, children }: {
  column: Column; filtered: boolean; disabled: boolean; mobile: boolean; onAdd: (id: number) => void; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}`, disabled });
  // plane.so's column: a light surface, the state icon, the name in regular weight and a quiet count.
  return <section ref={setNodeRef} className={cn('flex min-w-0 shrink-0 flex-col gap-3 rounded-lg bg-muted/40 p-2', mobile ? 'w-full' : 'w-board-column', isOver && 'ring-2 ring-ring')} aria-labelledby={`column-${column.id}`}>
    <div className="flex min-h-7 items-center gap-2 px-1">
      <StatusIcon status={column.kind} className="size-4" role="img" aria-label={statusNames[column.kind]} />
      <h2 id={`column-${column.id}`} className="min-w-0 break-words text-sm font-normal">{column.name}</h2>
      <span className="text-sm tabular-nums text-muted-foreground">{filtered ? `${column.visibleCount} de ${column.totalCount}` : column.totalCount}</span>
    </div>
    {!column.visibleCount && <p className="py-5 text-sm text-muted-foreground">{filtered ? 'Nenhuma tarefa com estes filtros.' : 'Nenhuma tarefa nesta coluna.'}</p>}
    {children}
    <Button variant="ghost" className="w-full justify-start" onClick={() => onAdd(column.id)}><Plus aria-hidden />Adicionar tarefa</Button>
  </section>;
}

function BoardTask({ task, column, columns, tasks, index, filtered, disabled, busy, mobile, pendingColumnId, onOpen, onEdit, onObjective, onDelete, move }: {
  task: WorkTask; column: Column; columns: Column[]; tasks: WorkTask[]; index: number; filtered: boolean; disabled: boolean; busy: boolean; mobile: boolean; pendingColumnId: number;
  onOpen: (task: WorkTask) => void; onEdit: (task: WorkTask) => void; onObjective: (id: number) => void; onDelete: (task: WorkTask) => void; move: Move;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: disabled || mobile, animateLayoutChanges: () => false });
  const overdue = isTaskOverdue(task, productNow().date);
  return <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('relative min-w-0 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/40', isDragging && 'opacity-40')} aria-busy={busy}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <Badge variant={PRIORITY[task.priority].badge}>{PRIORITY[task.priority].label}</Badge>
      <div className="relative z-10 flex items-center">
        {!mobile && <Button ref={setActivatorNodeRef} {...attributes} {...listeners} variant="ghost" size="icon" className="touch-none cursor-grab active:cursor-grabbing" disabled={disabled} aria-label={`Arrastar ${task.title}`}><GripVertical aria-hidden /></Button>}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ações da tarefa ${task.title}`} disabled={disabled}><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => onEdit(task)}><Pencil aria-hidden />Editar tarefa</DropdownMenuItem>
            <DropdownMenuLabel>Mover para…</DropdownMenuLabel>
            {columns.filter(c => c.id !== column.id).map(c => <DropdownMenuItem key={c.id} onSelect={() => void move(task, c.id)}><ArrowRight aria-hidden />{c.name} · {statusNames[c.kind]}</DropdownMenuItem>)}
            {!filtered && index > 0 && <DropdownMenuItem onSelect={() => void move(task, column.id, tasks[index - 1].id)}><ArrowUp aria-hidden />Mover acima</DropdownMenuItem>}
            {!filtered && index < tasks.length - 1 && <DropdownMenuItem onSelect={() => void move(task, column.id, tasks[index + 2]?.id ?? null)}><ArrowDown aria-hidden />Mover abaixo</DropdownMenuItem>}
            {task.status === 'CANCELLED' && <DropdownMenuItem onSelect={() => void move(task, pendingColumnId)}><Undo2 aria-hidden />Reabrir tarefa</DropdownMenuItem>}
          </DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(task)}><Trash2 aria-hidden />Excluir tarefa</DropdownMenuItem>
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <TaskLabels labels={task.labels} />
    {/* The title's ::after covers the card, so a click anywhere opens the details. No press transform: it would shrink the overlay to the title. */}
    <Button variant="ghost" className="h-auto min-h-10 w-full justify-start whitespace-normal p-0 text-left text-sm font-medium after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:bg-transparent active:transform-none" aria-haspopup="dialog" onClick={() => onOpen(task)}>{task.title}</Button>
    {task.objective && <Button variant="link" className="relative z-10 mt-1 h-auto min-h-10 w-full justify-start whitespace-normal px-0 text-left" onClick={() => onObjective(task.objectiveId!)}>{task.objective.title}</Button>}
    <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
      <p className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0" aria-hidden />{task.plannedDate ? `Planejada: ${formatDue(task.plannedDate)}` : 'Sem planejamento'}{task.startTime && <><Clock className="size-3 shrink-0" aria-hidden />{task.startTime.slice(0, 5)}</>}</p>
      {task.dueDate && <p className={cn('flex items-center gap-2', overdue && 'text-negative')}><Flag className="size-4 shrink-0" aria-hidden />Prazo: {formatDue(task.dueDate)}{overdue ? ' · Ultrapassado' : ''}</p>}
      {task.completedAt && <p>Concluída em {formatDue(task.completedAt)}</p>}
    </div>
  </article>;
}
