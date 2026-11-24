import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus, CircleCheck, Kanban, ListChecks, MoreHorizontal, Pin, Pencil, Target, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useProjectFlags } from '@/hooks/useWork';
import { formatDue } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { WorkProject } from '@/types/work';

const chip = 'inline-flex h-8 flex-none items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-2.5 text-sm text-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';
const overlayButton = 'size-8 rounded-md border border-border bg-card shadow-sm hover:bg-accent';

/** A read-only property; `label` is the full reading, shown in a tooltip on hover or focus and read by screen readers. */
function Property({ label, icon, className, children }: { label: string; icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Focusable so keyboard users can reach the tooltip too. */}
          <span tabIndex={0} className={cn(chip, 'cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}>
            {icon}
            <span aria-hidden>{children}</span>
            <span className="sr-only">{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="px-2 py-1 text-xs">{label}</TooltipContent>
      </Tooltip>
    </li>
  );
}

const count = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

/**
 * Project card in the plane.so layout: a cover with the project's mark and its actions, the title, the
 * description when there is one and the project's state as chips. The whole card opens the project.
 */
export function ProjectCard({ project, onEdit, onDelete }: {
  project: WorkProject; onEdit: (p: WorkProject) => void; onDelete: (id: number) => void;
}) {
  const flags = useProjectFlags();
  const s = project.summary;
  const development = project.mode === 'DEVELOPMENT';
  const href = `/tasks/project/${project.id}`;
  const attention = [
    s.overdueObjectiveCount > 0 ? count(s.overdueObjectiveCount, 'objetivo com prazo ultrapassado', 'objetivos com prazo ultrapassado') : null,
    development && (s.overdueTaskCount ?? 0) > 0 ? count(s.overdueTaskCount ?? 0, 'tarefa com prazo ultrapassado', 'tarefas com prazo ultrapassado') : null,
    development && (s.dueTodayTaskCount ?? 0) > 0 ? count(s.dueTodayTaskCount ?? 0, 'prazo hoje', 'prazos hoje') : null,
    development && (s.previousPlansCount ?? 0) > 0 ? count(s.previousPlansCount ?? 0, 'planejamento anterior pendente', 'planejamentos anteriores pendentes') : null,
  ].filter(Boolean) as string[];
  const attentionCount = s.overdueObjectiveCount + (development ? (s.overdueTaskCount ?? 0) + (s.dueTodayTaskCount ?? 0) + (s.previousPlansCount ?? 0) : 0);
  const objectivesLabel = s.totalObjectives ? `Objetivos concluídos: ${s.completedObjectives} de ${s.totalObjectives}` : 'Nenhum objetivo definido';
  const tasksLabel = `${s.nonCancelledTasks ? `Tarefas concluídas: ${s.completedTasks} de ${s.nonCancelledTasks}` : 'Nenhuma tarefa ativa'}${s.cancelledTasks ? ` · ${count(s.cancelledTasks, 'cancelada', 'canceladas')}` : ''}`;
  const next = development
    ? s.nextPlannedTask && { label: `Próxima tarefa planejada: ${s.nextPlannedTask.title} · ${formatDue(s.nextPlannedTask.plannedDate)}${s.nextPlannedTask.startTime ? ` · ${s.nextPlannedTask.startTime.slice(0, 5)}` : ''}`, short: formatDue(s.nextPlannedTask.plannedDate) ?? '' }
    : s.nextObjective
      ? { label: `Próximo objetivo: ${s.nextObjective.title} · ${formatDue(s.nextObjective.dueDate)}`, short: formatDue(s.nextObjective.dueDate) ?? '' }
      : s.totalObjectives > s.completedObjectives ? { label: 'Objetivos sem prazo', short: 'Sem prazo' } : null;
  // A tint of the project's own colour stands in for a cover picture; it is user data, hence inline.
  const tint = !project.imageUrl && project.color ? { backgroundColor: `color-mix(in srgb, ${project.color} 22%, hsl(var(--card)))` } : undefined;

  return (
    <Card className="group/card relative flex min-w-0 flex-col overflow-hidden border-border shadow-none transition-colors hover:border-foreground/20">
      <div className={cn('relative h-32 shrink-0', !project.imageUrl && !project.color && 'bg-muted')} style={tint}>
        {project.imageUrl && <>
          <img src={project.imageUrl} alt="" className="size-full object-cover" />
          {/* A neutral scrim lets the picture settle into the card, as on plane.so. */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card to-transparent" />
        </>}
        <span aria-hidden className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-md border border-border bg-card shadow-sm">
          <span className={cn('size-3.5 rounded-full', !project.color && 'bg-muted-foreground')} style={project.color ? { backgroundColor: project.color } : undefined} />
        </span>
        <div className="absolute right-3 top-3 z-10 flex gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={overlayButton} aria-label={`Ações do projeto ${project.title}`}><MoreHorizontal aria-hidden /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => onEdit(project)}><Pencil aria-hidden />Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(project.id)}><Trash2 aria-hidden />Excluir</DropdownMenuItem>
            </DropdownMenuGroup></DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className={overlayButton} aria-label={`Fixar ${project.title}`} aria-pressed={project.favorite} disabled={flags.isPending}
            onClick={() => flags.mutate({ project, field: 'favorite', value: !project.favorite })}>
            <Pin aria-hidden className={project.favorite ? 'fill-current text-primary' : undefined} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4 pt-3">
        <h3 className="min-w-0 truncate text-lg font-medium leading-7">
          {/* The title's ::after covers the card, so a click anywhere opens the project; controls sit on z-10. */}
          <Link to={href} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring">{project.title}</Link>
        </h3>
        {project.description && <p className="truncate text-sm text-muted-foreground" title={project.description}>{project.description}</p>}

        <ul aria-label={`Resumo de ${project.title}`} className="pointer-events-none relative z-10 mt-3 flex flex-wrap gap-2 [&>*]:pointer-events-auto">
          <Property label={development ? 'Projeto de desenvolvimento' : 'Projeto simples'} icon={development ? <Kanban aria-hidden /> : <ListChecks aria-hidden />}>{development ? 'Desenvolvimento' : 'Simples'}</Property>
          <Property label={objectivesLabel} icon={<Target aria-hidden />} className={cn(!s.totalObjectives && 'text-muted-foreground')}>
            {s.totalObjectives ? `${s.completedObjectives}/${s.totalObjectives}` : 'Sem objetivos'}
          </Property>
          {development && (
            <Property label={tasksLabel} icon={<CircleCheck aria-hidden />} className={cn(!s.nonCancelledTasks && 'text-muted-foreground')}>
              {s.nonCancelledTasks ? `${s.completedTasks}/${s.nonCancelledTasks}` : 'Sem tarefas'}
            </Property>
          )}
          {attention.length > 0 && (
            <Property label={`Atenção: ${attention.join(' · ')}`} icon={<TriangleAlert aria-hidden className="!text-negative" />} className="text-negative">{attentionCount}</Property>
          )}
          {next && <Property label={next.label} icon={<CalendarDays aria-hidden />} className="tabular-nums">{next.short}</Property>}
          {development && !s.nextPlannedTask && (
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={`${href}?planning=unscheduled&open=1`} aria-label="Planejar próxima tarefa" className={cn(chip, 'w-8 justify-center px-0 hover:bg-accent')}>
                    <CalendarPlus aria-hidden />
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="px-2 py-1 text-xs">Planejar próxima tarefa</TooltipContent>
              </Tooltip>
            </li>
          )}
        </ul>

        <div className="relative z-10 empty:hidden">
          <WorkFeedback error={flags.error} />
          {flags.data?.refreshFailed && <WorkFeedback message="Salvo. Recarregue as listas para atualizar os dados." />}
        </div>
      </div>
    </Card>
  );
}
