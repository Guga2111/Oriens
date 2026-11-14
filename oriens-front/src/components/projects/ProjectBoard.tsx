import { useRef, useState } from 'react';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WorkSelect } from '@/components/common/WorkSelect';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useTaskWrites } from '@/hooks/useWork';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { formatDue } from '@/lib/date';
import { productNow } from '@/lib/product-time';
import { statusNames } from '@/lib/work-form';
import type { BoardResponse, WorkTask } from '@/types/work';

export function ProjectBoard({ board, pendingColumnId, onEdit, onAdd, onObjective }: {
  board: BoardResponse; pendingColumnId: number; onEdit: (task: WorkTask) => void; onAdd: (column: number) => void; onObjective: (id: number) => void;
}) {
  const writes = useTaskWrites(); const mobile = useMediaQuery('(max-width: 639px)');
  const [selected, setSelected] = useState(String(board.columns[0]?.id ?? ''));
  const [deleting, setDeleting] = useState<WorkTask | null>(null);
  const [announcement, setAnnouncement] = useState(''); const [moving, setMoving] = useState<number | null>(null);
  const dragged = useRef<WorkTask | null>(null);
  const region = useRef<HTMLDivElement>(null);
  const current = board.columns.some(c => String(c.id) === selected) ? selected : String(board.columns[0]?.id ?? '');
  const columns = mobile ? board.columns.filter(c => String(c.id) === current) : board.columns;
  async function move(task: WorkTask, columnId: number, beforeTaskId: number | null = null) {
    setMoving(task.id);
    try {
      const result = await writes.patch.mutateAsync({ id: task.id, body: { version: task.version, projectVersion: board.projectVersion, columnId, beforeTaskId } });
      setAnnouncement(result.refreshFailed ? 'Movimento salvo. Recarregue o quadro para atualizar.' : `Tarefa movida para ${board.columns.find(c => c.id === columnId)?.name}.`);
      if (mobile) setSelected(String(columnId));
      requestAnimationFrame(() => region.current?.focus());
    } catch { /* Keep the confirmed board and announce error inline. */ } finally { setMoving(null); }
  }
  return <div className="min-w-0 max-sm:[&_button]:min-h-11" ref={region} tabIndex={-1} aria-label="Quadro de tarefas">
    <WorkFeedback error={writes.patch.error} />{announcement && <p className="mb-3 text-sm" role="status">{announcement}</p>}
    {board.filtered && <p className="mb-3 text-sm text-muted-foreground">Movimentos entre colunas vão para o final. Reordenação desativada enquanto houver filtros.</p>}
    {mobile && <div className="mb-4"><WorkSelect label="Coluna do quadro" value={current} onChange={setSelected} options={board.columns.map(c => ({ value: String(c.id), label: `${c.name} (${c.visibleCount})` }))} /></div>}
    <div className="flex min-w-0 gap-4 overflow-x-auto pb-4" aria-label="Colunas do quadro">
      {columns.map(column => {
        const tasks = board.tasks.filter(t => t.columnId === column.id);
        return <section key={column.id} className="flex w-full min-w-0 shrink-0 flex-col gap-3 rounded-lg bg-muted/40 p-3 sm:w-[300px]" aria-labelledby={`column-${column.id}`}
          onDragOver={e => { if (dragged.current) e.preventDefault(); }} onDrop={e => { e.preventDefault(); const task = dragged.current; dragged.current = null; if (task && (task.columnId !== column.id || !board.filtered)) void move(task, column.id); }}>
          <div className="flex items-start justify-between gap-2"><h2 id={`column-${column.id}`} className="min-w-0 break-words text-base font-semibold">{column.name}</h2><span className="shrink-0 text-sm tabular-nums">{board.filtered ? `${column.visibleCount} de ${column.totalCount}` : column.totalCount}</span></div>
          <p className="text-xs text-muted-foreground">{statusNames[column.kind]}</p>
          {tasks.length === 0 && <p className="py-5 text-sm text-muted-foreground">{board.filtered ? 'Nenhuma tarefa com estes filtros.' : 'Nenhuma tarefa nesta coluna.'}</p>}
          {tasks.map((task, index) => <article key={task.id} className="min-w-0 rounded-md border bg-card p-3" aria-busy={moving === task.id}
            onDragOver={e => { if (!board.filtered && dragged.current?.columnId === column.id) { e.preventDefault(); e.stopPropagation(); } }}
            onDrop={e => { if (!board.filtered && dragged.current?.columnId === column.id) { e.preventDefault(); e.stopPropagation(); const draggedTask = dragged.current; dragged.current = null; if (draggedTask.id !== task.id) void move(draggedTask, column.id, task.id); } }}>
            <div className="flex items-start gap-1"><Button variant="ghost" className="h-auto min-h-11 min-w-0 flex-1 justify-start whitespace-normal p-0 text-left" onClick={() => onEdit(task)}>{task.title}</Button>
              {!mobile && <Button variant="ghost" size="icon" draggable disabled={moving !== null} aria-label={`Arrastar ${task.title}`} onDragStart={e => { e.dataTransfer.setData('text/plain', String(task.id)); e.dataTransfer.effectAllowed = 'move'; dragged.current = task; }} onDragEnd={() => { dragged.current = null; }}><GripVertical aria-hidden /></Button>}
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ações da tarefa ${task.title}`} disabled={moving !== null}><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-sm:[&_[role=menuitem]]:min-h-11"><DropdownMenuGroup><DropdownMenuLabel>Mover para…</DropdownMenuLabel>
                {board.columns.filter(c => c.id !== column.id).map(c => <DropdownMenuItem key={c.id} onSelect={() => void move(task, c.id)}>{c.name} · {statusNames[c.kind]}</DropdownMenuItem>)}
                {!board.filtered && index > 0 && <DropdownMenuItem onSelect={() => void move(task, column.id, tasks[index - 1].id)}>Mover acima</DropdownMenuItem>}
                {!board.filtered && index < tasks.length - 1 && <DropdownMenuItem onSelect={() => void move(task, column.id, tasks[index + 2]?.id ?? null)}>Mover abaixo</DropdownMenuItem>}
                {task.status === 'CANCELLED' && <DropdownMenuItem onSelect={() => { void move(task, pendingColumnId); }}>Reabrir tarefa</DropdownMenuItem>}
                <DropdownMenuItem onSelect={() => setDeleting(task)}>Excluir tarefa</DropdownMenuItem>
              </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
            </div>
            {task.objective && <Button variant="link" className="mt-1 h-auto min-h-11 w-full justify-start whitespace-normal px-0 text-left" onClick={() => onObjective(task.objectiveId!)}>{task.objective.title}</Button>}
            <p className="mt-2 text-sm text-muted-foreground">{task.plannedDate ? `Planejada: ${formatDue(task.plannedDate)}${task.startTime ? ` · ${task.startTime.slice(0, 5)}` : ' · Sem horário'}` : 'Sem planejamento'}</p>
            {task.dueDate && <p className={task.dueDate < productNow().date && ['PENDING', 'ON_DOING'].includes(task.status) ? "mt-1 text-sm text-negative" : "mt-1 text-sm"}>Prazo: {formatDue(task.dueDate)}{task.dueDate < productNow().date && ['PENDING', 'ON_DOING'].includes(task.status) ? " · Ultrapassado" : ""}</p>}
            {task.completedAt && <p className="mt-1 text-sm text-muted-foreground">Concluída em {formatDue(task.completedAt)}</p>}
          </article>)}
          <Button variant="outline" className="w-full" onClick={() => onAdd(column.id)}>Adicionar tarefa</Button>
        </section>;
      })}
    </div>
    <ConfirmDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }} title="Excluir tarefa?" objectName={deleting?.title ?? ''} confirmLabel="Excluir tarefa" error={writes.remove.error}
      onConfirm={async () => {
        if (!deleting) return false;
        try { const result = await writes.remove.mutateAsync(deleting); setAnnouncement(result.refreshFailed ? 'Tarefa excluída. Recarregue o quadro.' : 'Tarefa excluída.'); region.current?.focus(); return true; }
        catch { return false; }
      }} />
  </div>;
}
