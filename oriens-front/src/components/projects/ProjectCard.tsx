import { Link } from 'react-router-dom';
import { ArrowUpRight, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useProjectFlags } from '@/hooks/useWork';
import { formatDue } from '@/lib/date';
import type { WorkProject } from '@/types/work';

export function ProjectCard({ project, onEdit, onDelete }: {
  project: WorkProject; onEdit: (p: WorkProject) => void; onDelete: (id: number) => void;
}) {
  const flags = useProjectFlags();
  const s = project.summary;
  const development = project.mode === 'DEVELOPMENT';
  const attention = [
    s.overdueObjectiveCount > 0 ? `${s.overdueObjectiveCount} objetivos com prazo ultrapassado` : null,
    development && (s.overdueTaskCount ?? 0) > 0 ? `${s.overdueTaskCount} tarefas com prazo ultrapassado` : null,
    development && (s.dueTodayTaskCount ?? 0) > 0 ? `${s.dueTodayTaskCount} prazos hoje` : null,
    development && (s.previousPlansCount ?? 0) > 0 ? `${s.previousPlansCount} planejamentos anteriores` : null,
  ].filter(Boolean).join(' · ');
  return <Card className="flex min-w-0 flex-col border-border/50 shadow-none max-sm:[&_button]:min-h-11 max-sm:[&_a]:min-h-11">
    {project.imageUrl && <img src={project.imageUrl} alt="" className="aspect-project-cover w-full rounded-t-lg object-cover" />}
    <CardHeader className="p-5 pb-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0">
      <CardTitle className="break-words text-lg leading-6"><span aria-hidden className="mr-2 inline-block size-2 rounded-full bg-muted-foreground" style={project.color ? { backgroundColor: project.color } : undefined} /><Link to={`/tasks/project/${project.id}`}>{project.title}</Link></CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">{development ? 'Desenvolvimento' : 'Simples'}</p>
    </div><Button variant="ghost" size="icon" aria-label={`Favoritar ${project.title}`} aria-pressed={project.favorite} disabled={flags.isPending}
      onClick={() => flags.mutate({ project, field: 'favorite', value: !project.favorite })}><Star aria-hidden className={project.favorite ? 'fill-current' : ''} /></Button></div>
    {project.description && <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>}</CardHeader>
    <CardContent className="flex flex-col gap-3 px-5 pb-4 text-sm">
      <p>{s.totalObjectives ? `${s.completedObjectives}/${s.totalObjectives} objetivos concluídos` : 'Nenhum objetivo definido'}</p>
      {!development && s.totalObjectives > 0 && <Progress value={Math.trunc(s.completedObjectives / s.totalObjectives * 100)} aria-label={`${Math.trunc(s.completedObjectives / s.totalObjectives * 100)}% dos objetivos concluídos`} />}
      {development && <p>{s.nonCancelledTasks ? `${s.completedTasks}/${s.nonCancelledTasks} tarefas concluídas` : 'Nenhuma tarefa ativa'}{s.cancelledTasks ? ` · ${s.cancelledTasks} canceladas` : ''}</p>}
      {attention && <p className="text-negative">{attention}</p>}
      <div className="rounded-md bg-muted/40 p-3"><p className="font-medium">{development ? 'Próxima tarefa planejada' : 'Próximo objetivo'}</p>
        <p className="mt-1">{development ? s.nextPlannedTask ? `${s.nextPlannedTask.title} · ${formatDue(s.nextPlannedTask.plannedDate)}${s.nextPlannedTask.startTime ? ` · ${s.nextPlannedTask.startTime.slice(0, 5)}` : ''}` : 'Nenhuma tarefa planejada' : s.nextObjective ? `${s.nextObjective.title} · ${formatDue(s.nextObjective.dueDate)}` : s.totalObjectives > s.completedObjectives ? 'Objetivos sem prazo' : 'Nenhum objetivo pendente'}</p>
        {development && !s.nextPlannedTask && <Button asChild variant="link" className="mt-1 h-auto p-0"><Link to={`/tasks/project/${project.id}?planning=unscheduled&open=1`}>Planejar próxima tarefa</Link></Button>}
      </div><WorkFeedback error={flags.error} />{flags.data?.refreshFailed && <WorkFeedback message="Salvo. Recarregue as listas para atualizar os dados." />}
    </CardContent>
    <CardFooter className="mt-auto flex items-center justify-between gap-2 px-5 pb-4">
      <Button asChild variant="outline"><Link to={`/tasks/project/${project.id}`}><ArrowUpRight aria-hidden />{development ? 'Abrir quadro' : 'Abrir projeto'}</Link></Button>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ações do projeto ${project.title}`}><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onEdit(project)}><Pencil aria-hidden />Editar</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(project.id)}><Trash2 aria-hidden />Excluir</DropdownMenuItem>
        </DropdownMenuGroup></DropdownMenuContent>
      </DropdownMenu>
    </CardFooter>
  </Card>;
}
