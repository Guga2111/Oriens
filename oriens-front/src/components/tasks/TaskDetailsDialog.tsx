import { useState, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, ChevronDown, Flag, MapPin, Pencil, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { TaskLabelBadge } from '@/components/tasks/TaskLabels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTaskDetail, useTaskWrites } from '@/hooks/useWork';
import { formatLongDate } from '@/lib/date';
import { productNow } from '@/lib/product-time';
import { PRIORITY, TASK_STATUS } from '@/lib/labels';
import { statusNames } from '@/lib/work-form';
import { cn } from '@/lib/utils';
import type { BoardResponse, WorkTask } from '@/types/work';

export interface TaskDetailsDialogProps {
  taskId: number;
  projectId: number;
  /** Columns of the current board, offered as move targets. */
  columns?: BoardResponse['columns'];
  /** Confirmed board snapshot shown while the detail is fetched. */
  placeholder?: WorkTask;
  onClose: () => void;
  onEdit: (task: WorkTask) => void;
  onObjective: (objectiveId: number) => void;
}

/** Read-only view of a board task; editing stays in TaskEditor. */
export function TaskDetailsDialog({ taskId, projectId, columns = [], placeholder, onClose, onEdit, onObjective }: TaskDetailsDialogProps) {
  const detail = useTaskDetail(taskId, placeholder);
  const writes = useTaskWrites();
  const [deleting, setDeleting] = useState(false);
  const task = detail.data?.projectId === projectId ? detail.data : undefined;
  // Another owner's task is a 404; another project's task cannot use this board's columns.
  const missing = (!!detail.data && !task) || isNotFound(detail.error);
  const busy = writes.patch.isPending || writes.remove.isPending;
  const close = (open: boolean) => { if (!open && !busy) onClose(); };

  async function move(columnId: number) {
    if (!task) return;
    try {
      const result = await writes.patch.mutateAsync({ id: task.id, body: { version: task.version, projectVersion: task.project!.version, columnId, beforeTaskId: null } });
      const name = columns.find(c => c.id === columnId)?.name;
      toast.success(result.refreshFailed ? 'Movimento salvo. Recarregue o quadro para atualizar.' : `Tarefa movida para ${name}.`);
    } catch { /* The mutation error is shown inside the dialog. */ }
  }
  async function remove() {
    if (!task) return false;
    try {
      const result = await writes.remove.mutateAsync(task);
      toast.success(result.refreshFailed ? 'Tarefa excluída. Recarregue o quadro.' : 'Tarefa excluída.');
      onClose();
      return true;
    } catch { return false; }
  }
  function reload() { writes.patch.reset(); writes.remove.reset(); void detail.refetch(); }

  const footer = task && <>
    <Button type="button" variant="ghost" className="text-destructive hover:text-destructive sm:mr-auto" disabled={busy} onClick={() => setDeleting(true)}><Trash2 aria-hidden />Excluir</Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" variant="outline" disabled={busy || columns.length < 2}><ArrowRight aria-hidden />Mover para<ChevronDown aria-hidden /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuGroup>
        {columns.filter(c => c.id !== task.columnId).map(c => <DropdownMenuItem key={c.id} onSelect={() => void move(c.id)}>{c.name} · {statusNames[c.kind]}</DropdownMenuItem>)}
      </DropdownMenuGroup></DropdownMenuContent>
    </DropdownMenu>
    <Button type="button" disabled={busy} onClick={() => onEdit(task)}><Pencil aria-hidden />Editar</Button>
  </>;

  return <>
    <ResponsiveDialog open onOpenChange={close} className="sm:max-w-task-dialog" footer={footer}
      title={task ? task.title : missing || detail.isError ? 'Tarefa indisponível' : 'Carregando tarefa'}
      description={task ? [task.project?.title, task.column?.name].filter(Boolean).join(' · ') : undefined}>
      {task ? <TaskDetails task={task} onObjective={onObjective} feedback={<WorkFeedback error={writes.patch.error || writes.remove.error} retry={reload} />} />
        : missing ? <WorkFeedback message="Tarefa não encontrada neste projeto." />
        : detail.isError ? <WorkFeedback error={detail.error} retry={() => void detail.refetch()} />
        : <div className="flex flex-col gap-4" aria-label="Carregando tarefa"><Skeleton className="h-6 w-40" /><Skeleton className="h-20 w-full" /><Skeleton className="h-32 w-full" /></div>}
    </ResponsiveDialog>
    <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Excluir tarefa?" objectName={task?.title ?? ''} confirmLabel="Excluir tarefa" error={writes.remove.error} onConfirm={remove} />
  </>;
}

function isNotFound(error: unknown) {
  return isAxiosError(error) && error.response?.status === 404;
}

function TaskDetails({ task, onObjective, feedback }: { task: WorkTask; onObjective: (id: number) => void; feedback: ReactNode }) {
  const today = productNow().date;
  const open = task.status === 'PENDING' || task.status === 'ON_DOING';
  const overdue = !!task.dueDate && task.dueDate < today && open;
  return <div className="flex min-w-0 flex-col gap-6">
    <ul aria-label="Prioridade, estado e etiquetas" className="flex min-w-0 flex-wrap gap-1.5">
      <li><Badge variant={PRIORITY[task.priority].badge}>Prioridade {PRIORITY[task.priority].label.toLowerCase()}</Badge></li>
      <li><Badge variant={TASK_STATUS[task.status].badge}>{TASK_STATUS[task.status].label}</Badge></li>
      {(task.labels ?? []).map(label => <li key={label.id} className="min-w-0 max-w-full"><TaskLabelBadge label={label} /></li>)}
    </ul>
    {feedback}
    <section aria-labelledby="task-details-description" className="flex flex-col gap-2">
      <h3 id="task-details-description" className="text-sm font-medium">Descrição</h3>
      {task.description
        ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{task.description}</p>
        : <p className="text-sm text-muted-foreground">Sem descrição.</p>}
    </section>
    <Separator />
    <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-task-details">
      {task.objective && <Detail icon={Target} label="Objetivo">
        <Button variant="link" className="h-auto justify-start whitespace-normal p-0 text-left" onClick={() => onObjective(task.objective!.id)}>{task.objective.title}</Button>
      </Detail>}
      <Detail icon={CalendarDays} label="Planejada">
        {task.plannedDate ? <>{formatLongDate(task.plannedDate)}{task.startTime && <span className="text-muted-foreground"> · {task.startTime.slice(0, 5)}</span>}</> : <span className="text-muted-foreground">Sem planejamento</span>}
      </Detail>
      <Detail icon={Flag} label="Prazo final">
        {task.dueDate ? <span className={cn(overdue && 'font-medium text-negative')}>{formatLongDate(task.dueDate)}{overdue && ' · Ultrapassado'}</span> : <span className="text-muted-foreground">Sem prazo</span>}
      </Detail>
      {task.location?.address && <Detail icon={MapPin} label="Localização">{task.location.address}</Detail>}
      <Detail icon={CalendarPlus} label="Criada em">{formatLongDate(task.createdAt)}</Detail>
      {task.completedAt && <Detail icon={CheckCircle2} label="Concluída em">{formatLongDate(task.completedAt)}</Detail>}
    </dl>
  </div>;
}

function Detail({ icon: Icon, label, children }: { icon: typeof Target; label: string; children: ReactNode }) {
  return <div className="contents">
    <dt className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4 shrink-0" aria-hidden />{label}</dt>
    <dd className="min-w-0 break-words max-sm:-mt-3 max-sm:pl-6">{children}</dd>
  </div>;
}
