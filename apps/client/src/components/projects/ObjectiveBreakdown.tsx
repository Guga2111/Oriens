import { Flag, Tag, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { StatusIcon } from '@/components/tasks/StatusIcon';
import { PRIORITY, PRIORITY_ORDER, TASK_STATUS } from '@/lib/labels';
import { TaskLabelBadge } from '@/components/tasks/TaskLabels';
import { cn } from '@/lib/utils';
import type { TaskPriority, TaskStatus } from '@/types/task';
import type { TaskLabel } from '@/types/task-label';
import type { WorkTask } from '@/types/work';

type BreakdownRow = { id: string; label: string; count: number; icon: ReactNode; tone: string; taskLabel?: TaskLabel };
const STATES: TaskStatus[] = ['BACKLOG', 'PENDING', 'ON_DOING', 'CONCLUDED', 'CANCELLED'];
const STATE_TONES: Record<TaskStatus, string> = {
  BACKLOG: 'text-muted-foreground', PENDING: 'text-muted-foreground', ON_DOING: 'text-state-started',
  CONCLUDED: 'text-state-completed', CANCELLED: 'text-state-cancelled',
};
const PRIORITY_TONES: Record<TaskPriority, string> = { URGENT: 'text-priority-urgent', HIGH: 'text-priority-high', MEDIUM: 'text-priority-medium', LOW: 'text-priority-low', NONE: 'text-muted-foreground' };

function Rows({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  return <dl className="flex flex-col gap-4 py-3">
    {rows.map(row => {
      const percent = total ? Math.round(row.count / total * 100) : 0;
      return <div key={row.id} className="flex min-w-0 items-center gap-3 text-sm">
        <dt className="flex min-w-0 flex-1 items-center gap-2">{row.taskLabel ? <TaskLabelBadge label={row.taskLabel} /> : <>{row.icon}<span className="min-w-0 break-words">{row.label}</span></>}</dt>
        <dd className="flex shrink-0 items-center gap-3 tabular-nums">
          <svg aria-hidden viewBox="0 0 100 6" className="h-1.5 w-14"><rect width="100" height="6" rx="3" fill="currentColor" className="text-muted" /><rect width={percent} height="6" rx="3" fill="currentColor" className={row.tone} /></svg>
          <span className="w-5 text-right">{row.count}</span><span className="w-10 text-right text-xs text-muted-foreground">{percent}%</span>
        </dd>
      </div>;
    })}
  </dl>;
}

function SmallIcon({ icon: Icon, tone }: { icon: LucideIcon; tone?: string }) {
  return <Icon aria-hidden className={cn('size-4 shrink-0', tone)} />;
}

export function ObjectiveBreakdown({ tasks, loading, error, onReload }: {
  tasks?: WorkTask[]; loading?: boolean; error?: unknown; onReload?: () => void;
}) {
  if (loading) return <div aria-label="Carregando distribuição" className="flex flex-col gap-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-32 w-full" /></div>;
  if (error) return <WorkFeedback error={error} retry={onReload} retryLabel="Recarregar distribuição" />;
  if (!tasks) return <p className="text-sm text-muted-foreground">Distribuição indisponível. Recarregue as tarefas para tentar novamente.</p>;
  const total = tasks.length;
  const states: BreakdownRow[] = STATES.map(status => ({ id: status, label: TASK_STATUS[status].label,
    count: tasks.filter(task => task.status === status).length, icon: <StatusIcon status={status} className="size-4" />, tone: STATE_TONES[status] }));
  const priorities: BreakdownRow[] = PRIORITY_ORDER.map(priority => ({ id: priority, label: PRIORITY[priority].label,
    count: tasks.filter(task => task.priority === priority).length, icon: <SmallIcon icon={Flag} tone={PRIORITY_TONES[priority]} />, tone: PRIORITY_TONES[priority] }));
  const labels = new Map<number, { label: TaskLabel; count: number }>();
  for (const task of tasks) {
    for (const label of new Map(task.labels?.map(label => [label.id, label])).values()) {
      const group = labels.get(label.id);
      labels.set(label.id, { label, count: (group?.count ?? 0) + 1 });
    }
  }
  const labelRows: BreakdownRow[] = [...labels.values()].sort((a, b) => a.label.name.localeCompare(b.label.name, 'pt-BR')).map(({ label, count }) => ({
    id: String(label.id), label: label.name, count, tone: 'text-muted-foreground',
    icon: null, taskLabel: label,
  }));
  const unlabelled = tasks.filter(task => !task.labels?.length).length;
  if (unlabelled || !labelRows.length) labelRows.push({ id: 'none', label: 'Sem etiquetas', count: unlabelled, tone: 'text-muted-foreground', icon: <SmallIcon icon={Tag} tone="text-muted-foreground" /> });
  return <Tabs defaultValue="state">
    <TabsList className="grid w-full grid-cols-3" aria-label="Distribuição das tarefas">
      <TabsTrigger value="state">Estado</TabsTrigger><TabsTrigger value="labels">Etiquetas</TabsTrigger><TabsTrigger value="priority">Prioridades</TabsTrigger>
    </TabsList>
    <TabsContent value="state"><Rows rows={states} total={total} /></TabsContent>
    <TabsContent value="labels"><Rows rows={labelRows} total={total} />{tasks.some(task => (task.labels?.length ?? 0) > 1) && <p className="text-xs text-muted-foreground">Uma tarefa pode aparecer em mais de uma etiqueta.</p>}</TabsContent>
    <TabsContent value="priority"><Rows rows={priorities} total={total} /></TabsContent>
    <p className="mt-2 text-xs text-muted-foreground">{total ? `Percentuais sobre ${total} ${total === 1 ? 'tarefa vinculada' : 'tarefas vinculadas'}, incluindo canceladas.` : 'Nenhuma tarefa vinculada.'}</p>
  </Tabs>;
}
