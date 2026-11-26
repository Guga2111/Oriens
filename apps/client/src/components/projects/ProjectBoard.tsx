import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BoardTask, BoardTaskOverlay } from './BoardTask';
import { DndContext, DragOverlay, KeyboardCode, KeyboardSensor, MeasuringStrategy, PointerSensor, closestCorners, pointerWithin, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { StatusIcon } from '@/components/tasks/StatusIcon';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WorkSelect } from '@/components/common/WorkSelect';
import { useBoardTaskMoves, useTaskWrites } from '@/hooks/useWork';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useProductToday } from '@/hooks/useProductToday';
import type { BoardMove } from '@/lib/board-move';
import { statusNames } from '@/lib/work-form';
import { cn } from '@/lib/utils';
import type { BoardFilters } from '@/services/projectService';
import type { BoardResponse, WorkTask } from '@/types/work';

// Keep collision geometry independent of the visual shifts applied during the drag.
const boardCollision: CollisionDetection = args => {
  if (!args.pointerCoordinates) return closestCorners(args);
  const hits = pointerWithin(args);
  const tasks = hits.filter(hit => typeof hit.id === 'number');
  if (tasks.length) return tasks;
  // Dropping on the source column's background appends, including in the sortable preview.
  const { columnId, sortable } = args.active.data.current ?? {};
  const last: unknown = sortable?.items.at(-1);
  if (typeof last === 'number' && hits.some(hit => hit.id === `column-${columnId}`)) return [{ id: last }];
  return hits;
};

type Column = BoardResponse['columns'][number];
type BoardDrag = { taskId: number; overId: UniqueIdentifier | null; height: number };

function boardDrop(board: BoardResponse, task: WorkTask | undefined, overId: UniqueIdentifier | null): BoardMove | null {
  if (!task || overId === null || task.id === overId) return null;
  const target = board.tasks.find(row => row.id === overId);
  const column = board.columns.find(row => `column-${row.id}` === overId || row.id === target?.columnId);
  if (!column) return null;
  const command = { taskId: task.id, columnId: column.id, beforeTaskId: board.filtered ? null : target?.id ?? null };
  if (task.columnId !== column.id) return command;
  if (board.filtered) return null;
  const rows = board.tasks.filter(row => row.columnId === column.id);
  const from = rows.findIndex(row => row.id === task.id);
  const to = target ? rows.findIndex(row => row.id === target.id) : rows.length - 1;
  if (from === to) return null;
  const reordered = arrayMove(rows, from, to);
  return { ...command, beforeTaskId: reordered[to + 1]?.id ?? null };
}

const insertionClass = 'pointer-events-none rounded-xl border-2 border-dashed border-ring bg-accent';
const dragShift = 'calc(var(--board-drag-height) + var(--board-card-gap))';

export function ProjectBoard({ board: confirmedBoard, filters, pendingColumnId, onOpen, onEdit, onAdd, onObjective }: {
  board: BoardResponse; filters: BoardFilters; pendingColumnId: number; onOpen: (task: WorkTask) => void; onEdit: (task: WorkTask) => void; onAdd: (column: number) => void; onObjective: (id: number) => void;
}) {
  const writes = useTaskWrites();
  const today = useProductToday();
  const mobile = useMediaQuery('(max-width: 639px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { preview, moving, moveTask } = useBoardTaskMoves(confirmedBoard.projectId, filters);
  const board = mobile ? confirmedBoard : preview ?? confirmedBoard;
  const [selected, setSelected] = useState(String(board.columns[0]?.id ?? ''));
  const [deleting, setDeleting] = useState<WorkTask | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [drag, setDrag] = useState<BoardDrag | null>(null);
  const region = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: [KeyboardCode.Space], end: [KeyboardCode.Space, KeyboardCode.Enter], cancel: [KeyboardCode.Esc] },
    }),
  );
  const current = board.columns.some(c => String(c.id) === selected) ? selected : String(board.columns[0]?.id ?? '');
  const columns = mobile ? board.columns.filter(c => String(c.id) === current) : board.columns;
  async function move(task: WorkTask, columnId: number, beforeTaskId: number | null = null) {
    if (mobile && moving.length) return;
    const request = moveTask({ taskId: task.id, columnId, beforeTaskId });
    if (!request) return;
    const restoreFocus = () => {
      if (document.activeElement !== document.body) return;
      const title = region.current?.querySelector<HTMLButtonElement>(`[data-board-task-title="${task.id}"]`);
      (title ?? region.current)?.focus({ preventScroll: true });
    };
    if (!mobile) requestAnimationFrame(restoreFocus);
    try {
      await request;
      const name = board.columns.find(column => column.id === columnId)?.name;
      setAnnouncement(`Tarefa movida para ${name}.`);
      if (mobile) setSelected(String(columnId));
    } catch {
      setAnnouncement('Movimento desfeito.');
    } finally {
      requestAnimationFrame(restoreFocus);
    }
  }
  function drop({ active, over }: DragEndEvent) {
    const task = board.tasks.find(t => t.id === active.id);
    const command = boardDrop(board, task, over?.id ?? null);
    if (task && command) void move(task, command.columnId, command.beforeTaskId);
    setDrag(null);
  }
  const activeId = drag?.taskId;
  const activeTask = board.tasks.find(t => t.id === activeId);
  const insertion = boardDrop(board, activeTask, drag?.overId ?? null);
  const crossColumn = insertion && insertion.columnId !== activeTask?.columnId ? insertion : null;
  return <div className="min-w-0 max-sm:[&_button]:min-h-11" ref={region} tabIndex={-1} aria-label="Quadro de tarefas">
    <p className="sr-only" role="status">{announcement}</p>
    {mobile && <div className="mb-4"><WorkSelect label="Coluna do quadro" value={current} onChange={setSelected} options={board.columns.map(c => ({ value: String(c.id), label: `${c.name} (${c.visibleCount})` }))} /></div>}
    <DndContext sensors={sensors} collisionDetection={boardCollision} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={({ active }) => setDrag({ taskId: Number(active.id), overId: null, height: 0 })}
      onDragOver={({ active, over }) => setDrag({
        taskId: Number(active.id), overId: over?.id ?? null, height: active.rect.current.initial?.height ?? 0,
      })}
      onDragEnd={drop} onDragCancel={() => setDrag(null)}
      accessibility={{ screenReaderInstructions: { draggable: 'Pressione espaço para pegar a tarefa, use as setas para mover, espaço para soltar ou Escape para cancelar.' },
        announcements: {
          onDragStart: ({ active }) => `Arrastando ${board.tasks.find(t => t.id === active.id)?.title}.`,
          onDragOver: ({ active, over }) => over?.id === active.id
            ? `Arrastando ${board.tasks.find(t => t.id === active.id)?.title}.`
            : over ? `Destino: ${board.columns.find(c => `column-${c.id}` === over.id)?.name ?? board.tasks.find(t => t.id === over.id)?.title}.` : 'Fora do quadro.',
          onDragEnd: () => 'Arraste finalizado.', onDragCancel: () => 'Movimento cancelado.',
        } }}>
      <ScrollArea orientation="horizontal" className="w-full">
        <div className="flex min-w-0 gap-4 pb-4 [--board-card-gap:theme(spacing.3)]" aria-label="Colunas do quadro"
          style={drag ? { '--board-drag-height': `${drag.height}px` } as CSSProperties : undefined}>
          {columns.map(column => {
            const tasks = board.tasks.filter(task => task.columnId === column.id);
            const incoming = crossColumn?.columnId === column.id ? crossColumn : null;
            const outgoing = crossColumn && activeTask?.columnId === column.id;
            const insertionIndex = incoming?.beforeTaskId == null
              ? tasks.length : tasks.findIndex(task => task.id === incoming.beforeTaskId);
            const sourceIndex = outgoing ? tasks.findIndex(task => task.id === activeId) : -1;
            return <BoardColumn key={column.id} column={column} filtered={board.filtered} mobile={mobile} onAdd={onAdd}
              incoming={!!incoming} outgoing={!!outgoing} append={!!incoming && insertionIndex === tasks.length}>
              <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((task, index) => <BoardTask key={task.id} task={task} column={column} columns={board.columns}
                  above={tasks[index - 1]} below={tasks[index + 1]} afterBelow={tasks[index + 2]} filtered={board.filtered}
                  busy={moving.includes(task.id)} today={today} mobile={mobile} reducedMotion={reducedMotion} menuDisabled={mobile && moving.length > 0}
                  pendingColumnId={pendingColumnId} onOpen={onOpen} onEdit={onEdit} onObjective={onObjective} onDelete={setDeleting} move={move}
                  sortPreview={!!insertion && !crossColumn}
                  shift={incoming && index >= insertionIndex ? dragShift : outgoing && index > sourceIndex ? `calc(-1 * ${dragShift})` : undefined}>
                  {incoming && index === insertionIndex && <InsertionSlot />}
                  {activeId === task.id && insertion && !crossColumn && <div aria-hidden data-board-insertion className={cn(insertionClass, 'absolute -inset-px')} />}
                </BoardTask>)}
              </SortableContext>
            </BoardColumn>;
          })}
        </div>
      </ScrollArea>
      <DragOverlay dropAnimation={null} style={{ pointerEvents: 'none' }}>
        {activeTask && <BoardTaskOverlay task={activeTask} today={today} />}
      </DragOverlay>
    </DndContext>
    <ConfirmDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }} title="Excluir tarefa?" objectName={deleting?.title ?? ''} confirmLabel="Excluir tarefa" error={writes.remove.error}
      onConfirm={async () => {
        if (!deleting) return false;
        try { const result = await writes.remove.mutateAsync(deleting); setAnnouncement(result.refreshFailed ? 'Tarefa excluída. Recarregue o quadro.' : 'Tarefa excluída.'); region.current?.focus(); return true; }
        catch { return false; }
      }} />
  </div>;
}

function InsertionSlot({ empty = false }: { empty?: boolean }) {
  return <div aria-hidden data-board-insertion className={cn(insertionClass,
    'h-[var(--board-drag-height)]', !empty && 'absolute inset-x-0 bottom-full mb-[var(--board-card-gap)]')} />;
}

function BoardColumn({ column, filtered, mobile, onAdd, children, incoming, outgoing, append }: {
  column: Column; filtered: boolean; mobile: boolean; onAdd: (id: number) => void; children: ReactNode;
  incoming: boolean; outgoing: boolean; append: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}` });
  const empty = !column.visibleCount;
  const shift = !empty && (incoming ? dragShift : outgoing && column.visibleCount > 1 ? `calc(-1 * ${dragShift})` : undefined);
  // plane.so's column: a light surface, the state icon, the name in regular weight and a quiet count.
  return <section ref={setNodeRef}
    className={cn('flex min-w-0 shrink-0 flex-col gap-[var(--board-card-gap)] rounded-lg bg-muted/40 p-2',
      mobile ? 'w-full' : 'w-board-column', (isOver || incoming) && 'ring-2 ring-ring',
      incoming && !empty && 'pb-[calc(theme(spacing.2)_+_var(--board-drag-height)_+_var(--board-card-gap))]')}
    aria-labelledby={`column-${column.id}`}>
    <div className="flex min-h-7 items-center gap-2 px-1">
      <StatusIcon status={column.kind} className="size-4" role="img" aria-label={statusNames[column.kind]} />
      <h2 id={`column-${column.id}`} className="min-w-0 break-words text-sm font-normal">{column.name}</h2>
      <span className="text-sm tabular-nums text-muted-foreground">{filtered ? `${column.visibleCount} de ${column.totalCount}` : column.totalCount}</span>
    </div>
    {empty && (incoming ? <InsertionSlot empty /> : <p className="py-5 text-sm text-muted-foreground">{filtered ? 'Nenhuma tarefa com estes filtros.' : 'Nenhuma tarefa nesta coluna.'}</p>)}
    {children}
    <div className={cn('relative', shift && 'motion-safe:transition-transform motion-safe:duration-200')} style={{ transform: shift ? `translateY(${shift})` : undefined }}>
      {append && !empty && <InsertionSlot />}
      <Button variant="ghost" className="w-full justify-start" onClick={() => onAdd(column.id)}><Plus aria-hidden />Adicionar tarefa</Button>
    </div>
  </section>;
}
