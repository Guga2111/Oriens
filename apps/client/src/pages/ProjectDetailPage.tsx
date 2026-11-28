import { useRecordVisit } from '@/hooks/useHome';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ImagePlus, MoreHorizontal, Pencil, Pin, PinOff, Plus, Trash2, Settings2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { HeaderActions } from '@/components/common/HeaderActions';
import { HeaderSearch } from '@/components/common/HeaderSearch';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { ProjectObjectives } from '@/components/projects/ProjectObjectives';
import { ProjectBoard } from '@/components/projects/ProjectBoard';
import { BoardSettings } from '@/components/projects/BoardSettings';
import { ProjectTimeline } from '@/components/projects/ProjectTimeline';
import { ProjectOverview } from '@/components/projects/ProjectOverview';
import { ProjectSummaryCard } from '@/components/projects/ProjectSummaryCard';
import { BoardFilterMenu } from '@/components/projects/BoardFilterMenu';
import { ComingSoonView } from '@/components/projects/ComingSoonView';
import { ViewSwitcher } from '@/components/common/ViewSwitcher';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import { TaskPeek } from '@/components/tasks/TaskPeek';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectBoard, useProjectFlags, useProjectWrites, useWorkProject } from '@/hooks/useWork';
import { useTimelineBoard } from '@/hooks/useTimelineBoard';
import { boardFiltersFromParams } from '@/lib/project-filters';
import type { TaskFilters } from '@/lib/task-filters';
import { objectiveLayoutFrom, projectSectionOf, projectTabFrom, WORK_VIEWS, workViewOf } from '@/lib/project-tabs';
import type { WorkTask } from '@/types/work';

const MAX_PROJECT_COVER_BYTES = 2 * 1024 * 1024;

export default function ProjectDetailPage() {
  const { id } = useParams();
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) return <div className="min-w-0 w-full"><PageHeader title="Projeto indisponível" /><Button asChild variant="link"><Link to="/projects">Voltar a Projetos</Link></Button></div>;
  return <ProjectDetail key={id} id={Number(id)} />;
}

function ProjectLoadState({ isPending, error, onRetry }: { isPending: boolean; error: unknown; onRetry: () => void }) {
  return (
    <div className="min-w-0 w-full">
      <Button asChild variant="link"><Link to="/projects">Voltar a Projetos</Link></Button>
      {isPending ? (
        <div className="mt-4 flex flex-col gap-4" role="status" aria-label="Carregando projeto">
          <Skeleton className="h-8 w-full max-w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : <WorkFeedback error={error} retry={onRetry} />}
    </div>
  );
}

// eslint-disable-next-line complexity -- existing score 58; owner: client maintainers.
function ProjectDetail({ id }: { id: number }) {
  const query = useWorkProject(id); const project = query.data;
  useRecordVisit('PROJECT', query.isSuccess ? id : undefined);
  const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  const tab = projectTabFrom(params.get('tab'));
  const { taskFilters, filters } = boardFiltersFromParams(params);
  const appliedSearch = taskFilters.search ?? '';
  const [searchDraft, setSearchDraft] = useState({ applied: appliedSearch, text: appliedSearch });
  const [searchOpen, setSearchOpen] = useState(Boolean(appliedSearch));
  if (searchDraft.applied !== appliedSearch) setSearchDraft({ applied: appliedSearch, text: appliedSearch });
  const searchText = searchDraft.applied === appliedSearch ? searchDraft.text : appliedSearch;
  const isSearchOpen = searchOpen || Boolean(appliedSearch);
  const board = useProjectBoard(project?.mode === 'DEVELOPMENT' ? id : 0, tab === 'overview' ? {} : filters);
  const allBoard = useProjectBoard(project?.mode === 'DEVELOPMENT' && tab === 'objectives' ? id : 0);
  const timeline = useTimelineBoard(project?.mode === 'DEVELOPMENT' && tab === 'timeline' ? id : 0).board;
  const flags = useProjectFlags(); const write = useProjectWrites(); const file = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false);
  const [deleting, setDeleting] = useState(false); const [converting, setConverting] = useState(false); const [settings, setSettings] = useState(false);
  const [editor, setEditor] = useState<{ task?: WorkTask; columnId?: number; objectiveId?: number } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const setParam = (name: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); if (!value || value === 'none') next.delete(name); else next.set(name, value); return next; });
  const changeTaskFilters = (update: Partial<TaskFilters>) => setParams(previous => {
    const next = new URLSearchParams(previous);
    for (const [name, value] of Object.entries(update)) {
      if (value && (!Array.isArray(value) || value.length > 0)) next.set(name, String(value));
      else next.delete(name);
    }
    return next;
  });
  const submitSearch = (search: string) => {
    const value = search.trim();
    if (value !== appliedSearch) changeTaskFilters({ search: value });
  };
  const clearFilters = () => {
    setSearchDraft({ applied: appliedSearch, text: '' });
    setSearchOpen(false);
    setParams(previous => {
      const next = new URLSearchParams(previous);
      for (const name of ['objective', 'planning', 'overdue', 'open', 'search', 'status', 'priority', 'labelId', 'dateField', 'startDate', 'endDate']) {
        next.delete(name);
      }
      return next;
    });
  };
  if (!project) return <ProjectLoadState isPending={query.isPending} error={query.error} onRetry={() => void query.refetch()} />;
  const development = project.mode === 'DEVELOPMENT';
  const editTask = (task: WorkTask) => setEditor({ task });
  // The open task lives in the URL (?task=ID) so details survive reloads and can be shared.
  const taskId = Number(params.get('task'));
  const openTask = Number.isSafeInteger(taskId) && taskId > 0 ? taskId : 0;
  const showTask = (task: WorkTask) => setParams(previous => { const next = new URLSearchParams(previous); next.set('task', String(task.id)); return next; }, { replace: true });
  const closeTask = () => setParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); return next; }, { replace: true });
  const showObjective = (objective: number) => setParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); next.set('tab', 'objectives'); next.set('selectedObjective', String(objective)); return next; });
  const section = projectSectionOf(tab); const view = workViewOf(tab);
  const isOverview = development && section === 'overview';
  const newTask = () => setEditor({ columnId: project.defaultPendingColumnId! });
  const chooseCover = () => file.current?.click();
  const notices = <>
    {project.archived && <p className="mb-4 text-sm text-muted-foreground">Projeto arquivado. As tarefas continuam disponíveis na agenda.</p>}
    <div className="mb-4 flex flex-col gap-3 empty:hidden"><WorkFeedback error={query.error || flags.error || write.error} retry={() => void query.refetch()} />{flags.data?.refreshFailed && <WorkFeedback message="Salvo. Recarregue as listas para atualizar os dados." />}<WorkFeedback message={uploadError} /></div>
  </>;
  return <div className="min-w-0 w-full tabular-nums">
    <HeaderActions>
      {development && view === 'board' && <HeaderSearch label="Buscar tarefas" inputLabel="Buscar por título ou descrição"
        placeholder="Buscar…" value={searchText} onChange={text => setSearchDraft({ applied: appliedSearch, text })}
        open={isSearchOpen} onOpenChange={setSearchOpen} onSubmit={() => submitSearch(searchText)} onClear={() => submitSearch('')}
        className={isSearchOpen ? 'max-sm:w-28 max-sm:[&_input]:px-7' : undefined} />}
      {development && view && <ViewSwitcher label="Visão dos itens de trabalho" views={WORK_VIEWS} value={view} onChange={next => setParam('tab', next)} />}
      {development && view === 'board' && <BoardFilterMenu filters={filters} taskFilters={taskFilters} objectives={project.objectives ?? []}
        onChange={setParam} onTaskFilterChange={changeTaskFilters} onClear={clearFilters} />}
      {development && section !== 'objectives' && <Button size="sm" onClick={newTask}><Plus aria-hidden /><span className="max-md:sr-only">Nova tarefa</span></Button>}
      {/* Project actions belong to Panorama and the work items; the Objectives page keeps only its own actions. */}
      {!(development && section === 'objectives') && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Ações do projeto"><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-sm:[&_[role=menuitem]]:min-h-11"><DropdownMenuGroup>
        <DropdownMenuItem disabled={write.isPending} onSelect={chooseCover}><ImagePlus aria-hidden />{project.imageUrl ? 'Trocar capa' : 'Adicionar capa'}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setEdit(true)}><Pencil aria-hidden />Editar projeto</DropdownMenuItem>
        <DropdownMenuItem disabled={flags.isPending} onSelect={() => flags.mutate({ project, field: 'favorite', value: !project.favorite })}>
          {project.favorite ? <PinOff aria-hidden /> : <Pin aria-hidden />}{project.favorite ? 'Desafixar' : 'Fixar'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={flags.isPending} onSelect={() => flags.mutate({ project, field: 'archive', value: !project.archived })}><Archive aria-hidden />{project.archived ? 'Desarquivar' : 'Arquivar'}</DropdownMenuItem>
        {development && <DropdownMenuItem onSelect={() => setSettings(true)}><Settings2 aria-hidden />Configurar quadro</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => setDeleting(true)}><Trash2 aria-hidden />Excluir projeto</DropdownMenuItem>
      </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>}
    </HeaderActions>
    {isOverview ? (
      <ProjectOverview project={project} board={board} notices={notices} coverPending={write.isPending}
        onChooseCover={chooseCover} onReload={() => void query.refetch()} />
    ) : <>
      {!development && project.imageUrl && <img src={project.imageUrl} alt={`Capa de ${project.title}`} className="mb-6 aspect-project-cover w-full rounded-lg object-cover" />}
      <h1 className="sr-only">{project.title}</h1>
      {notices}
    </>}
    {development ? <div>
      {/* Project sections use the sidebar; work views use the header. */}
      {section === 'objectives' && <ProjectObjectives project={project} tasks={allBoard.data?.tasks} tasksLoading={allBoard.isPending} tasksError={allBoard.error} onReloadTasks={() => void allBoard.refetch()} onSelectObjective={objectiveId => setParam('selectedObjective', objectiveId ? String(objectiveId) : '')} onAddTask={objectiveId => setEditor({ objectiveId, columnId: project.defaultPendingColumnId! })} onEditTask={showTask} selectedObjective={Number(params.get('selectedObjective')) || undefined}
        layout={objectiveLayoutFrom(params.get('layout'))} onLayoutChange={layout => setParam('layout', layout === 'list' ? '' : layout)} />}
      {view === 'board' && <section aria-label="Quadro do projeto">
        <WorkFeedback error={board.error} retry={() => void board.refetch()} />
        {board.isPending && <Skeleton className="h-64 w-full" />}
        {board.data && <ProjectBoard board={board.data} filters={filters} pendingColumnId={project.defaultPendingColumnId!} onOpen={showTask} onEdit={editTask} onAdd={columnId => setEditor({ columnId })} onObjective={showObjective} />}
      </section>}
      {view === 'timeline' && <ProjectTimeline project={project} onOpen={showTask} onAdd={newTask} />}
      {view && !WORK_VIEWS.find(item => item.value === view)!.ready && <ComingSoonView view={view} onPick={next => setParam('tab', next)} />}
    </div> : <div className="grid min-w-0 items-start gap-6 xl:grid-cols-project-detail">
      <ProjectObjectives project={project} onAddTask={() => {}} onEditTask={() => {}} />
      <ProjectSummaryCard project={project}><Button variant="outline" onClick={() => setConverting(true)}>Usar quadro de tarefas</Button></ProjectSummaryCard>
    </div>}
    <Input ref={file} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={async event => {
      const picture = event.target.files?.[0];
      event.target.value = '';
      if (!picture) return;
      setUploadError('');
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(picture.type) || picture.size > MAX_PROJECT_COVER_BYTES) {
        setUploadError('Use uma imagem PNG, JPEG ou WebP de até 2 MB.');
        return;
      }
      try { await write.mutateAsync({ action: 'picture', id, version: project.version, file: picture }); toast.success('Capa salva.'); }
      catch { /* WorkFeedback shows the mutation error. */ }
    }} />
    <CreateProjectDialog open={edit} onOpenChange={setEdit} projectToEdit={project} onSuccess={() => {}} />
    {deleting && <DeleteProjectDialog project={project} onClose={() => setDeleting(false)} onDeleted={() => navigate('/projects')} />}
    <ConfirmDialog error={write.error} open={converting} onOpenChange={setConverting} title="Usar quadro de tarefas?" objectName={project.title} confirmLabel="Converter para desenvolvimento" description="Seus objetivos serão preservados. O quadro começa com A fazer, Fazendo e Concluídas, sem criar tarefas. A conversão não pode ser desfeita."
      onConfirm={async () => { try { await write.mutateAsync({ action: 'convert', id, version: project.version }); return true; } catch { return false; } }} />
    {settings && board.data && <BoardSettings project={project} board={board.data} onReload={async () => { await query.refetch(); return (await board.refetch()).data; }} onClose={() => setSettings(false)} />}
    {/* The same task view as Hoje: side panel, modal or full screen, as set in Configurações. */}
    {development && openTask > 0 && !editor && <TaskPeek key={openTask} taskId={openTask}
      placeholder={[board, allBoard, timeline].map(b => b.data?.tasks.find(t => t.id === openTask)).find(Boolean)}
      onClose={closeTask} onEdit={editTask} />}
    {editor && <TaskEditor open onOpenChange={v => { if (!v) setEditor(null); }} task={editor.task} projectId={project.id} columnId={editor.columnId} objectiveId={editor.objectiveId} />}
  </div>;
}
