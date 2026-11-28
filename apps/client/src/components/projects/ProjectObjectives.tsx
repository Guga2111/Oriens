import { useState } from 'react';
import { Check, Forward, ListFilter, Pin, Plus, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { HeaderActions } from '@/components/common/HeaderActions';
import { ViewSwitcher } from '@/components/common/ViewSwitcher';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateObjectiveDialog, EditObjectiveDialog } from './ObjectiveEditor';
import { ObjectiveDetails } from './ObjectiveDetails';
import { ObjectiveMenu, type ObjectiveActionHandlers } from './ObjectiveActions';
import { ObjectiveGallery } from './ObjectiveGallery';
import { ObjectiveTimeline } from './ObjectiveTimeline';
import { ObjectivePeriodPicker, ObjectiveStatusIcon, ObjectiveStatusPicker } from './ObjectiveProperties';
import { useProjectWrites, useWorkProject } from '@/hooks/useWork';
import { cn } from '@/lib/utils';
import { OBJECTIVE_STATUSES, objectiveStatusLabel, pinnedFirst, type ObjectiveStatus } from '@/lib/objectives';
import { OBJECTIVE_LAYOUTS, objectiveWorkItemsHref, type ObjectiveLayout } from '@/lib/project-tabs';
import type { WorkObjective, WorkProject, WorkTask } from '@/types/work';

function ObjectiveProgress({ objective }: { objective: WorkObjective }) {
  const total = objective.nonCancelledTasks;
  if (total == null) return <ObjectiveStatusIcon status={objective.status} />;
  const completed = objective.completedTasks ?? 0;
  const progress = total > 0 ? Math.round(completed / total * 100) : 0;
  const done = total > 0 && completed >= total;
  const label = total > 0 ? `${completed} de ${total} tarefas concluídas (${progress}%)` : 'Nenhuma tarefa ativa vinculada';
  return <Tooltip><TooltipTrigger asChild><span className="relative flex size-10 shrink-0 items-center justify-center">
    <svg viewBox="0 0 40 40" className="!size-10 -rotate-90" role="progressbar" aria-label={`Progresso de ${objective.title}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-valuetext={label}>
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
      {progress > 0 && <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" pathLength="100" strokeDasharray={`${progress} 100`} strokeLinecap="round" className="text-state-completed" />}
    </svg>{done
      ? <Check aria-hidden className="absolute size-4 text-state-completed" />
      : <span aria-hidden className="absolute text-2xs tabular-nums text-muted-foreground">{progress}%</span>}
  </span></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

type ObjectivePatch = { status?: ObjectiveStatus; startDate?: string | null; dueDate?: string | null; favorite?: boolean };

/**
 * The Objectives page: a list, a gallery or a timeline (`layout`, chosen in the header when `onLayoutChange` is
 * given; projects without a board only have the list). Pinned objectives come first in every layout.
 */
// eslint-disable-next-line complexity -- existing score 25; owner: client maintainers.
export function ProjectObjectives({ project, tasks, tasksLoading, tasksError, onReloadTasks, onAddTask, onEditTask, selectedObjective, onSelectObjective, layout = 'list', onLayoutChange }: {
  project: WorkProject; tasks?: WorkTask[]; tasksLoading?: boolean; tasksError?: unknown; onReloadTasks?: () => void;
  onAddTask: (id: number) => void; onEditTask: (task: WorkTask) => void;
  selectedObjective?: number; onSelectObjective?: (id?: number) => void;
  layout?: ObjectiveLayout; onLayoutChange?: (layout: ObjectiveLayout) => void;
}) {
  const objectives = project.objectives ?? [];
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WorkObjective | null>(null);
  const [localSelection, setLocalSelection] = useState<number | null>();
  const [filter, setFilter] = useState<ObjectiveStatus | 'all'>('all');
  const [deleting, setDeleting] = useState<WorkObjective | null>(null);
  const write = useProjectWrites();
  const current = useWorkProject(project.id);
  const selection = onSelectObjective ? selectedObjective : localSelection === undefined ? selectedObjective : localSelection;
  const selected = objectives.find(objective => objective.id === selection);
  const select = (id?: number) => { if (onSelectObjective) onSelectObjective(id); else setLocalSelection(id ?? null); };
  const rows = pinnedFirst(filter === 'all' ? objectives : objectives.filter(objective => objective.status === filter));
  async function patch(objective: WorkObjective, fields: ObjectivePatch) {
    try {
      const result = await write.mutateAsync({ action: 'objective-patch', id: project.id, objectiveId: objective.id, body: { version: objective.version, ...fields } });
      const done = fields.favorite === undefined ? 'Objetivo atualizado.' : fields.favorite ? 'Objetivo fixado.' : 'Objetivo desafixado.';
      toast.success(result.refreshFailed ? 'Salvo. Recarregue os dados.' : done); return true;
    } catch { return false; }
  }
  const actions: ObjectiveActionHandlers = {
    onPin: objective => { void patch(objective, { favorite: !objective.favorite }); },
    onEdit: setEditing,
    onDelete: objective => { write.reset(); setDeleting(objective); },
  };
  return <section aria-labelledby="objectives-title" className={cn("min-w-0", project.mode === 'DEVELOPMENT' && "-mx-page -mt-4 md:-mx-12 md:-mt-9", layout === 'timeline' && "-mb-4 md:-mb-6")}>
    <h2 id="objectives-title" className="sr-only">Objetivos</h2>
    <HeaderActions>
      {onLayoutChange && <ViewSwitcher label="Visão dos objetivos" views={OBJECTIVE_LAYOUTS} value={layout} onChange={onLayoutChange} />}
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label={filter === 'all' ? 'Filtrar objetivos por status' : `Filtrar objetivos: ${objectiveStatusLabel(filter)}`}>
        <ListFilter aria-hidden />
        {filter !== 'all' && <span aria-hidden className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />}
      </Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={filter} onValueChange={value => setFilter(value as typeof filter)}>
          <DropdownMenuRadioItem value="all">Todos os status</DropdownMenuRadioItem>
          {OBJECTIVE_STATUSES.map(status => <DropdownMenuRadioItem value={status.value} key={status.value}><ObjectiveStatusIcon status={status.value} />{status.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent></DropdownMenu>
      <Button size="sm" onClick={() => setCreating(true)}><Plus aria-hidden />Novo objetivo</Button>
    </HeaderActions>
    <div className="px-page empty:hidden"><WorkFeedback error={tasksError} retry={onReloadTasks} /><WorkFeedback error={write.error} retry={() => { void current.refetch().then(() => write.reset()); }} /></div>
    {!rows.length ? null : layout === 'gallery' ? <ObjectiveGallery objectives={rows} projectId={project.id} tasks={tasks} busy={write.isPending} onOpen={select} onPatch={patch} actions={actions} />
      : layout === 'timeline' ? <ObjectiveTimeline objectives={rows} onOpen={select} />
      : <ul aria-label="Lista de objetivos" className="divide-y divide-border border-b bg-card">
      {rows.map(objective => <li id={`objective-${objective.id}`} key={objective.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-page py-2.5 hover:bg-accent/50 md:px-6 max-sm:[&_button]:min-h-11">
        <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-0 text-left hover:bg-transparent" onClick={() => select(objective.id)} aria-label={`Abrir objetivo ${objective.title}${objective.favorite ? ', fixado' : ''}`}>
          <ObjectiveProgress objective={objective} /><span className="min-w-0 break-words">{objective.title}</span>
          {objective.favorite && <Pin aria-hidden className="fill-current text-primary" />}
        </Button>
        <div className="flex max-w-full flex-wrap items-center gap-2 max-sm:order-3 max-sm:w-full max-sm:pl-12">
          <ObjectivePeriodPicker objective={objective} disabled={write.isPending} onSave={(startDate, dueDate) => patch(objective, { startDate, dueDate })} />
          <ObjectiveStatusPicker value={objective.status} label={`Status de ${objective.title}`} disabled={write.isPending} onChange={status => { if (status !== objective.status) void patch(objective, { status }); }} />
        </div>
        {project.mode === 'DEVELOPMENT' && <Tooltip><TooltipTrigger asChild><Button asChild variant="ghost" size="icon">
          <Link to={objectiveWorkItemsHref(project.id, objective.id)} aria-label={`Ver itens de trabalho do objetivo ${objective.title}`}><Forward aria-hidden /></Link>
        </Button></TooltipTrigger><TooltipContent>Ver itens de trabalho</TooltipContent></Tooltip>}
        <ObjectiveMenu objective={objective} disabled={write.isPending} {...actions} />
      </li>)}
    </ul>}
    {!rows.length && <Empty><EmptyHeader><EmptyMedia variant="icon"><Target aria-hidden /></EmptyMedia>
      <EmptyTitle>{objectives.length ? 'Nenhum objetivo neste status' : 'Defina seu primeiro objetivo'}</EmptyTitle>
      <EmptyDescription>{objectives.length ? 'Escolha outro status para ver os demais objetivos.' : 'Organize os resultados do projeto e acompanhe as tarefas de cada objetivo.'}</EmptyDescription>
    </EmptyHeader><EmptyContent><Button variant="outline" onClick={() => objectives.length ? setFilter('all') : setCreating(true)}>{objectives.length ? 'Limpar filtro' : 'Novo objetivo'}</Button></EmptyContent></Empty>}
    {creating && <CreateObjectiveDialog project={project} onClose={() => setCreating(false)} />}
    {editing && <EditObjectiveDialog key={editing.id} objective={editing} project={project} onClose={() => setEditing(null)} />}
    {selected && !editing && !deleting && <ObjectiveDetails key={selected.id} objective={selected} project={project} tasks={tasks} tasksLoading={tasksLoading} tasksError={tasksError} onReloadTasks={onReloadTasks} onClose={() => select(undefined)} busy={write.isPending} error={write.error} onReload={() => { void current.refetch().then(() => write.reset()); }} onPatch={fields => patch(selected, fields)} onEdit={() => setEditing(selected)} onDelete={() => { write.reset(); setDeleting(selected); }} onAddTask={onAddTask} onEditTask={onEditTask} />}
    <ConfirmDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }} error={write.error} title="Excluir objetivo?" objectName={deleting?.title ?? ''} confirmLabel="Excluir objetivo"
      description="As tarefas serão preservadas no mesmo projeto e coluna, sem vínculo com este objetivo."
      onConfirm={async () => {
        if (!deleting) return false;
        try { const result = await write.mutateAsync({ action: 'objective-delete', id: project.id, objective: deleting, projectVersion: project.version });
          toast.success(result.refreshFailed ? 'Objetivo excluído. Recarregue os dados.' : 'Objetivo excluído.'); setDeleting(null); return true;
        } catch { return false; }
      }} />
  </section>;
}
