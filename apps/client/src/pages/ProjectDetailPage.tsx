import { useRecordVisit } from '@/hooks/useHome';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ImagePlus, MoreHorizontal, Pencil, Plus, Trash2, Settings2, Star, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { HeaderActions } from '@/components/common/HeaderActions';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { ProjectObjectives } from '@/components/projects/ProjectObjectives';
import { ProjectBoard } from '@/components/projects/ProjectBoard';
import { BoardSettings } from '@/components/projects/BoardSettings';
import { ProjectTimeline } from '@/components/projects/ProjectTimeline';
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
import type { BoardFilters } from '@/services/projectService';
import { objectiveLayoutFrom, projectSectionOf, projectTabFrom, WORK_VIEWS, workViewOf } from '@/lib/project-tabs';
import type { WorkTask } from '@/types/work';

export default function ProjectDetailPage() {
  const { id } = useParams();
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) return <div className="min-w-0 w-full"><PageHeader title="Projeto indisponível" /><Button asChild variant="link"><Link to="/projects">Voltar a Projetos</Link></Button></div>;
  return <ProjectDetail key={id} id={Number(id)} />;
}
function ProjectDetail({ id }: { id: number }) {
  const query = useWorkProject(id); const project = query.data;
  useRecordVisit('PROJECT', query.isSuccess ? id : undefined);
  const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  const tab = projectTabFrom(params.get('tab'));
  const filters: BoardFilters = { ...(params.get('objective') ? { objectiveId: Number(params.get('objective')) } : {}),
    ...(['today', 'unscheduled'].includes(params.get('planning') ?? '') ? { planning: params.get('planning') as 'today' | 'unscheduled' } : {}),
    ...(params.get('overdue') === '1' ? { overdue: true } : {}), ...(params.get('open') === '1' ? { open: true } : {}) };
  const board = useProjectBoard(project?.mode === 'DEVELOPMENT' ? id : 0, filters);
  const allBoard = useProjectBoard(project?.mode === 'DEVELOPMENT' && tab === 'objectives' ? id : 0);
  const timeline = useTimelineBoard(project?.mode === 'DEVELOPMENT' && tab === 'timeline' ? id : 0).board;
  const flags = useProjectFlags(); const write = useProjectWrites(); const file = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false); const [deleting, setDeleting] = useState(false); const [converting, setConverting] = useState(false); const [settings, setSettings] = useState(false);
  const [editor, setEditor] = useState<{ task?: WorkTask; columnId?: number; objectiveId?: number } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const setParam = (name: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); if (!value || value === 'none') next.delete(name); else next.set(name, value); return next; });
  const clearFilters = () => setParams(previous => { const next = new URLSearchParams(previous); ['objective', 'planning', 'overdue', 'open'].forEach(k => next.delete(k)); return next; });
  if (!project) return <div className="min-w-0 w-full"><Button asChild variant="link"><Link to="/projects">Voltar a Projetos</Link></Button>{query.isPending ? <div className="mt-4 flex flex-col gap-4" aria-label="Carregando projeto"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div> : <WorkFeedback error={query.error} retry={() => void query.refetch()} />}</div>;
  const development = project.mode === 'DEVELOPMENT';
  const editTask = (task: WorkTask) => setEditor({ task });
  // The open task lives in the URL (?task=ID) so details survive reloads and can be shared.
  const taskId = Number(params.get('task'));
  const openTask = Number.isSafeInteger(taskId) && taskId > 0 ? taskId : 0;
  const showTask = (task: WorkTask) => setParams(previous => { const next = new URLSearchParams(previous); next.set('task', String(task.id)); return next; }, { replace: true });
  const closeTask = () => setParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); return next; }, { replace: true });
  const showObjective = (objective: number) => setParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); next.set('tab', 'objectives'); next.set('selectedObjective', String(objective)); return next; });
  const section = projectSectionOf(tab); const view = workViewOf(tab);
  const newTask = () => setEditor({ columnId: project.defaultPendingColumnId! });
  return <div className="min-w-0 w-full tabular-nums">
    <HeaderActions>
      {development && view && <ViewSwitcher label="Visão dos itens de trabalho" views={WORK_VIEWS} value={view} onChange={next => setParam('tab', next)} />}
      {development && view === 'board' && <BoardFilterMenu filters={filters} objectives={project.objectives ?? []} onChange={setParam} onClear={clearFilters} />}
      {development && section !== 'objectives' && <Button size="sm" onClick={newTask}><Plus aria-hidden /><span className="max-md:sr-only">Nova tarefa</span></Button>}
      {/* Project actions belong to Panorama and the work items; the Objectives page keeps only its own actions. */}
      {!(development && section === 'objectives') && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Ações do projeto"><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-sm:[&_[role=menuitem]]:min-h-11"><DropdownMenuGroup>
        <DropdownMenuItem disabled={write.isPending} onSelect={() => file.current?.click()}><ImagePlus aria-hidden />{project.imageUrl ? 'Trocar capa' : 'Adicionar capa'}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setEdit(true)}><Pencil aria-hidden />Editar projeto</DropdownMenuItem>
        <DropdownMenuItem disabled={flags.isPending} onSelect={() => flags.mutate({ project, field: 'favorite', value: !project.favorite })}><Star aria-hidden />{project.favorite ? 'Desfavoritar' : 'Favoritar'}</DropdownMenuItem>
        <DropdownMenuItem disabled={flags.isPending} onSelect={() => flags.mutate({ project, field: 'archive', value: !project.archived })}><Archive aria-hidden />{project.archived ? 'Desarquivar' : 'Arquivar'}</DropdownMenuItem>
        {development && <DropdownMenuItem onSelect={() => setSettings(true)}><Settings2 aria-hidden />Configurar quadro</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => setDeleting(true)}><Trash2 aria-hidden />Excluir projeto</DropdownMenuItem>
      </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>}
    </HeaderActions>
    {project.imageUrl && <img src={project.imageUrl} alt={`Capa de ${project.title}`} className="mb-6 aspect-project-cover w-full rounded-lg object-cover" />}
    {/* The breadcrumb names the project, as on plane.so; the h1 stays for screen readers and page structure. */}
    <h1 className="sr-only">{project.title}</h1>
    {project.archived && <p className="mb-4 text-sm text-muted-foreground">Projeto arquivado. As tarefas continuam disponíveis na agenda.</p>}
    <div className="mb-4 flex flex-col gap-3 empty:hidden"><WorkFeedback error={query.error || flags.error || write.error} retry={() => void query.refetch()} />{flags.data?.refreshFailed && <WorkFeedback message="Salvo. Recarregue as listas para atualizar os dados." />}</div>
    {development ? <div>
      {/* Panorama, the work items and Objetivos are pages of the project, chosen in the sidebar; the views of the work items are chosen in the header. */}
      {section === 'overview' && <ProjectSummaryCard project={project} className="max-w-md" />}
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
    <div className={uploadError ? "mt-4" : undefined}><WorkFeedback message={uploadError} />
      <Input ref={file} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => { const picture = e.target.files?.[0]; if (!picture) return;
        setUploadError(''); if (!['image/png', 'image/jpeg', 'image/webp'].includes(picture.type) || picture.size > 5 * 1024 * 1024) { setUploadError('Use uma imagem PNG, JPEG ou WebP de até 5 MB.'); return; }
        try { await write.mutateAsync({ action: 'picture', id, version: project.version, file: picture }); toast.success('Capa salva.'); } catch { /* Error is shown near project actions. */ } finally { if (file.current) file.current.value = ''; }
      }} />
    </div>
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
