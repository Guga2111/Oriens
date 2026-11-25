import { useState } from 'react';
import { CalendarDays, ChevronDown, MoreHorizontal, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { ObjectiveBreakdown } from './ObjectiveBreakdown';
import { ObjectivePeriodPicker, ObjectiveStatusIcon, ObjectiveStatusPicker } from './ObjectiveProperties';
import { StatusIcon } from '@/components/tasks/StatusIcon';
import { isActiveObjective, type ObjectiveStatus } from '@/lib/objectives';
import { TASK_STATUS } from '@/lib/labels';
import { isTaskOverdue } from '@/lib/tasks';
import { useProductToday } from '@/hooks/useProductToday';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types/task';
import type { WorkObjective, WorkProject, WorkTask } from '@/types/work';

const TASK_STATES: TaskStatus[] = ['CONCLUDED', 'ON_DOING', 'PENDING', 'BACKLOG', 'CANCELLED'];

function DetailSection({ title, children, summary }: { title: string; children: React.ReactNode; summary?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return <Collapsible open={open} onOpenChange={setOpen}>
    <div className="mb-3 flex items-center justify-between gap-3"><CollapsibleTrigger asChild>
      <Button type="button" variant="ghost" size="sm" className="-ml-2.5" aria-label={title}><span>{title}</span><ChevronDown aria-hidden className={open ? '' : '-rotate-90'} /></Button>
    </CollapsibleTrigger>{summary}</div>
    <CollapsibleContent>{children}</CollapsibleContent>
  </Collapsible>;
}

export function ObjectiveDetails({ objective, project, tasks, tasksLoading, tasksError, onReloadTasks, onClose, onAddTask, onEditTask, onEdit, onDelete, onPatch, busy, error, onReload }: {
  objective: WorkObjective; project: WorkProject; tasks?: WorkTask[]; tasksLoading?: boolean; tasksError?: unknown; onReloadTasks?: () => void;
  onClose: () => void; onAddTask: (id: number) => void; onEditTask: (task: WorkTask) => void;
  onEdit: () => void; onDelete: () => void; busy: boolean; error?: unknown; onReload: () => void;
  onPatch: (fields: { status?: ObjectiveStatus; startDate?: string | null; dueDate?: string | null }) => Promise<boolean>;
}) {
  const today = useProductToday();
  const linked = tasks?.filter(task => task.objectiveId === objective.id);
  const overdue = linked && !tasksLoading && !tasksError ? linked.filter(task => isTaskOverdue(task, today)).length : undefined;
  const total = objective.nonCancelledTasks ?? 0;
  const completed = objective.completedTasks ?? 0;
  const percent = total > 0 ? Math.round(completed / total * 100) : 0;
  return <Sheet open modal={false} onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <SheetContent side="right" showClose={false} className="flex w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-md max-sm:[&_button]:min-h-11">
      <header className="flex shrink-0 items-start gap-2 px-4 py-3">
        <span className="mt-2"><ObjectiveStatusIcon status={objective.status} /></span>
        <div className="min-w-0 flex-1"><SheetTitle className="break-words text-base">{objective.title}</SheetTitle><SheetDescription className="sr-only">Informações do objetivo em {project.title}</SheetDescription></div>
        <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={busy} aria-label="Ações do objetivo aberto"><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuGroup>
            <DropdownMenuItem onSelect={onEdit}><Pencil aria-hidden />Editar objetivo</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete}><Trash2 aria-hidden />Excluir objetivo</DropdownMenuItem>
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label="Fechar objetivo" onClick={onClose}><X aria-hidden /></Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <p className="whitespace-pre-wrap break-words py-2 text-sm text-muted-foreground">{objective.description || 'Nenhuma descrição adicionada.'}</p>
        <Separator className="my-4" />
        <DetailSection title="Propriedades">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><dt className="flex items-center gap-2 text-muted-foreground"><Target aria-hidden className="size-4" />Status</dt>
              <dd><ObjectiveStatusPicker value={objective.status} disabled={busy} onChange={status => { if (status !== objective.status) void onPatch({ status }); }} /></dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2"><dt className="flex items-center gap-2 text-muted-foreground"><CalendarDays aria-hidden className="size-4" />Período</dt>
              <dd className="min-w-0 max-w-full"><ObjectivePeriodPicker objective={objective} disabled={busy} onSave={(startDate, dueDate) => onPatch({ startDate, dueDate })} /></dd>
            </div>
          </dl>
        </DetailSection>
        <WorkFeedback error={error} retry={onReload} />
        {project.mode === 'DEVELOPMENT' && <>
          <Separator className="my-4" />
          <DetailSection title="Progresso" summary={<span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>}>
            <p className="mb-3 flex flex-wrap items-baseline gap-2"><strong className="text-xl tabular-nums">{percent}%</strong><span className="text-xs text-muted-foreground">{completed} de {total} tarefas concluídas</span></p>
            <Progress value={percent} aria-label="Progresso das tarefas do objetivo" className="h-1.5" />
            {!!objective.cancelledTasks && <p className="mt-2 text-xs text-muted-foreground">{objective.cancelledTasks} canceladas · fora do cálculo de progresso</p>}
            {linked && !tasksLoading && !tasksError && linked.length > 0 && <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs" aria-label="Distribuição das tarefas por status">
              {TASK_STATES.map(status => <div key={status} className="flex items-center justify-between gap-2"><dt className="flex items-center gap-2"><StatusIcon status={status} className="size-3.5" />{TASK_STATUS[status].label}</dt><dd className="tabular-nums">{linked.filter(task => task.status === status).length}</dd></div>)}
            </dl>}
            {isActiveObjective(objective) && total > 0 && completed === total && <p className="mt-3 text-xs text-muted-foreground">As tarefas terminaram. O resultado foi alcançado? Você pode concluir o objetivo manualmente pelo status.</p>}
          </DetailSection>
          <Separator className="my-4" />
          <section aria-labelledby={`objective-concerns-${objective.id}`}>
            <h3 id={`objective-concerns-${objective.id}`} className="mb-3 text-sm font-medium">Preocupações</h3>
            <dl className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1 rounded-lg border p-3">
                <dt className="order-2 text-xs">Atrasadas</dt>
                <dd className={cn('text-base font-semibold tabular-nums', overdue !== undefined && overdue > 0 && 'text-negative')}>
                  {tasksLoading ? <Skeleton className="h-6 w-8" aria-label="Carregando atrasadas" /> : overdue ?? '—'}
                </dd>
                {overdue === undefined && !tasksLoading && <dd className="order-3 text-xs text-muted-foreground">Dados indisponíveis</dd>}
              </div>
              <div className="flex flex-col gap-1 rounded-lg border p-3">
                <dt className="order-2 text-xs">Bloqueadas</dt>
                <dd className="text-base font-semibold text-muted-foreground">
                  <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" className="h-auto p-0 text-base font-semibold hover:bg-transparent" aria-label="Informações sobre tarefas bloqueadas">—</Button></TooltipTrigger>
                    <TooltipContent>Bloqueio ainda não disponível</TooltipContent>
                  </Tooltip>
                </dd>
              </div>
            </dl>
          </section>
          <Separator className="my-4" />
          <DetailSection title="Distribuição">
            <ObjectiveBreakdown tasks={linked} loading={tasksLoading} error={tasksError} onReload={onReloadTasks} />
          </DetailSection>
          <Separator className="my-4" />
          <DetailSection title="Tarefas vinculadas" summary={
            <Button type="button" variant="outline" size="sm" onClick={() => onAddTask(objective.id)}><Plus aria-hidden />Adicionar tarefa</Button>
          }>
            {tasksLoading ? <div aria-label="Carregando tarefas" className="flex flex-col gap-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              : tasksError ? <WorkFeedback error={tasksError} retry={onReloadTasks} />
              : linked ? linked.length ? <ul className="divide-y divide-border">{linked.map(task => <li key={task.id}><Button type="button" variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal text-left" onClick={() => onEditTask(task)}><StatusIcon status={task.status} /><span className="min-w-0 break-words">{task.title}</span></Button></li>)}</ul>
                : <Empty><EmptyHeader><EmptyTitle>Nenhuma tarefa vinculada</EmptyTitle><EmptyDescription>Adicione tarefas para acompanhar o progresso deste objetivo.</EmptyDescription></EmptyHeader></Empty>
                : <p className="text-sm text-muted-foreground">Tarefas indisponíveis. Recarregue o projeto para tentar novamente.</p>}
          </DetailSection>
        </>}
      </div>
    </SheetContent>
  </Sheet>;
}
