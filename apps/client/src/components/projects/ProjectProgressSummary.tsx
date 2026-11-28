import { useId } from 'react';
import { ListTodo, Target } from 'lucide-react';
import { Pie, PieChart } from 'recharts';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { ChartContainer } from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { useProjectBoard } from '@/hooks/useWork';
import { OBJECTIVE_STATUSES, type ObjectiveStatus } from '@/lib/objectives';
import type { BoardResponse, WorkProject } from '@/types/work';

const stageColors: Record<ObjectiveStatus, string> = {
  BACKLOG: 'hsl(var(--chart-5))',
  PENDING: 'hsl(var(--chart-4))',
  ON_DOING: 'hsl(var(--primary))',
  PAUSED: 'hsl(var(--chart-2))',
  CONCLUDED: 'hsl(var(--positive))',
  CANCELLED: 'hsl(var(--muted-foreground))',
};
const columnColors = [
  stageColors.BACKLOG, stageColors.PENDING, stageColors.ON_DOING,
  stageColors.CONCLUDED, stageColors.CANCELLED, stageColors.PAUSED, 'hsl(var(--chart-3))',
];
const number = new Intl.NumberFormat('pt-BR');

type Stage = { id: number | string; label: string; count: number; fill: string };

function objectiveStages(objectives: WorkProject['objectives']): Stage[] {
  const counts = new Map<ObjectiveStatus, number>();
  for (const { status } of objectives ?? []) {
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return OBJECTIVE_STATUSES.map(({ value, label }) => ({
    id: value, label, count: counts.get(value) ?? 0, fill: stageColors[value],
  }));
}

function taskStages(board: BoardResponse): Stage[] {
  const stages = board.columns.map(({ id, name, totalCount }, index) => ({
    id, label: name, count: totalCount, fill: columnColors[index % columnColors.length],
  }));
  const assigned = stages.reduce((sum, stage) => sum + stage.count, 0);
  const unassigned = board.total.totalTasks - assigned;
  return unassigned > 0 ? [...stages, {
    id: 'unassigned', label: 'Sem coluna', count: unassigned, fill: columnColors[stages.length % columnColors.length],
  }] : stages;
}

function StageDistribution({ stages, emptyMessage }: { stages: Stage[]; emptyMessage: string }) {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  if (!total) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;

  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <div className="relative size-24">
        <ChartContainer config={{}} aria-hidden className="size-full">
          <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
            <Pie data={stages.filter(stage => stage.count > 0)} dataKey="count" nameKey="label"
              innerRadius="69%" outerRadius="100%" stroke="hsl(var(--card))" strokeWidth={2}
              isAnimationActive={false} rootTabIndex={-1} />
          </PieChart>
        </ChartContainer>
        <p className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-tight">
          <span className="text-lg font-semibold tabular-nums">{number.format(total)}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </p>
      </div>
      <ul className="min-w-0 space-y-1.5 text-xs">
        {stages.map(stage => (
          <li key={stage.id} className="flex min-w-0 items-baseline gap-2">
            <span aria-hidden className="size-2 shrink-0 self-center rounded-full" style={{ backgroundColor: stage.fill }} />
            <span className="min-w-0 flex-1 break-words">{stage.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{number.format(stage.count)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectProgressSummary({ project, board }: {
  project: WorkProject;
  board: ReturnType<typeof useProjectBoard>;
}) {
  const objectivesId = useId();
  const tasksId = useId();
  const overdue = project.summary.overdueObjectiveCount;

  return (
    <aside aria-label="Informações do projeto" className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 md:p-5">
      <h2 className="text-base font-semibold">Resumo</h2>
      <section aria-labelledby={objectivesId} className="flex min-w-0 flex-col gap-3">
        <h3 id={objectivesId} className="flex items-center gap-2 text-sm font-medium">
          <Target aria-hidden className="size-4 text-muted-foreground" /> Objetivos por estágio
        </h3>
        <StageDistribution stages={objectiveStages(project.objectives)} emptyMessage="Nenhum objetivo definido." />
        {overdue > 0 && <p className="text-xs text-negative">{number.format(overdue)} {overdue === 1 ? 'objetivo com prazo ultrapassado' : 'objetivos com prazo ultrapassado'}</p>}
      </section>
      <Separator />
      <section aria-labelledby={tasksId} className="flex min-w-0 flex-col gap-3">
        <h3 id={tasksId} className="flex items-center gap-2 text-sm font-medium">
          <ListTodo aria-hidden className="size-4 text-muted-foreground" /> Tarefas por coluna
        </h3>
        {board.isPending && <div role="status" aria-label="Carregando distribuição de tarefas"><Skeleton className="h-24 w-full" /></div>}
        <WorkFeedback error={board.error} retry={() => void board.refetch()} />
        {board.data && <StageDistribution stages={taskStages(board.data)} emptyMessage="Nenhuma tarefa no projeto." />}
      </section>
    </aside>
  );
}
