import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ImagePlus, MoreHorizontal, Pencil, Plus, Trash2, Settings2, Star, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/common/PageHeader';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { WorkSelect } from '@/components/common/WorkSelect';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { ProjectObjectives } from '@/components/projects/ProjectObjectives';
import { ProjectBoard } from '@/components/projects/ProjectBoard';
import { BoardSettings } from '@/components/projects/BoardSettings';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectBoard, useProjectFlags, useProjectWrites, useWorkProject } from '@/hooks/useWork';
import type { BoardFilters } from '@/services/projectService';
import { parseLocalDate } from '@/lib/date';
import type { WorkTask } from '@/types/work';

export default function ProjectDetailPage() {
  const { id } = useParams();
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) return <div className="min-w-0 w-full"><PageHeader title="Projeto indisponível" /><Button asChild variant="link"><Link to="/projects">Voltar a Projetos</Link></Button></div>;
  return <ProjectDetail key={id} id={Number(id)} />;
}
function ProjectDetail({ id }: { id: number }) {
  const mobile = useMediaQuery('(max-width: 639px)');
  const [showFilters, setShowFilters] = useState(false);
  const query = useWorkProject(id); const project = query.data;
  const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  const tab = params.get('tab') === 'objectives' ? 'objectives' : 'board';
  const filters: BoardFilters = { ...(params.get('objective') ? { objectiveId: Number(params.get('objective')) } : {}),
    ...(['today', 'unscheduled'].includes(params.get('planning') ?? '') ? { planning: params.get('planning') as 'today' | 'unscheduled' } : {}),
    ...(params.get('overdue') === '1' ? { overdue: true } : {}), ...(params.get('open') === '1' ? { open: true } : {}) };
  const board = useProjectBoard(project?.mode === 'DEVELOPMENT' ? id : 0, filters);
  const allBoard = useProjectBoard(project?.mode === 'DEVELOPMENT' && tab === 'objectives' ? id : 0);
  const flags = useProjectFlags(); const write = useProjectWrites(); const file = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false); const [deleting, setDeleting] = useState(false); const [converting, setConverting] = useState(false); const [settings, setSettings] = useState(false);
  const [editor, setEditor] = useState<{ task?: WorkTask; columnId?: number; objectiveId?: number } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const setParam = (name: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); if (!value || value === 'none') next.delete(name); else next.set(name, value); return next; });
  const clearFilters = () => setParams(previous => { const next = new URLSearchParams(previous); ['objective', 'planning', 'overdue', 'open'].forEach(k => next.delete(k)); return next; });
  if (!project) return <div className="min-w-0 w-full"><Button asChild variant="link"><Link to="/projects">Voltar a Projetos</Link></Button>{query.isPending ? <div className="mt-4 flex flex-col gap-4" aria-label="Carregando projeto"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div> : <WorkFeedback error={query.error} retry={() => void query.refetch()} />}</div>;
  const development = project.mode === 'DEVELOPMENT'; const s = project.summary;
  const showTask = (task: WorkTask) => setEditor({ task });
  return <div className="min-w-0 w-full tabular-nums">
    {project.imageUrl && <img src={project.imageUrl} alt={`Capa de ${project.title}`} className="mb-6 aspect-project-cover w-full rounded-lg object-cover" />}
    <PageHeader title={project.title} description={project.description || (development ? 'Desenvolvimento' : 'Simples')} isLoading={query.isFetching}
      meta={project.archived ? 'Projeto arquivado. As tarefas continuam disponíveis na agenda.' : undefined}
      actions={<>{development && <Button className="max-sm:min-h-11" onClick={() => setEditor({ columnId: project.defaultPendingColumnId! })}><Plus aria-hidden />Nova tarefa</Button>}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="max-sm:size-11" aria-label="Ações do projeto"><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-sm:[&_[role=menuitem]]:min-h-11"><DropdownMenuGroup>
          <DropdownMenuItem disabled={write.isPending} onSelect={() => file.current?.click()}><ImagePlus aria-hidden />{project.imageUrl ? 'Trocar capa' : 'Adicionar capa'}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEdit(true)}><Pencil aria-hidden />Editar projeto</DropdownMenuItem>
          <DropdownMenuItem disabled={flags.isPending} onSelect={() => flags.mutate({ project, field: 'favorite', value: !project.favorite })}><Star aria-hidden />{project.favorite ? 'Desfavoritar' : 'Favoritar'}</DropdownMenuItem>
          <DropdownMenuItem disabled={flags.isPending} onSelect={() => flags.mutate({ project, field: 'archive', value: !project.archived })}><Archive aria-hidden />{project.archived ? 'Desarquivar' : 'Arquivar'}</DropdownMenuItem>
          {development && <DropdownMenuItem onSelect={() => setSettings(true)}><Settings2 aria-hidden />Configurar quadro</DropdownMenuItem>}
          <DropdownMenuItem onSelect={() => setDeleting(true)}><Trash2 aria-hidden />Excluir projeto</DropdownMenuItem>
        </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
      </>} />
    <div className="mt-4 flex flex-col gap-3"><WorkFeedback error={query.error || flags.error || write.error} retry={() => void query.refetch()} />{flags.data?.refreshFailed && <WorkFeedback message="Salvo. Recarregue as listas para atualizar os dados." />}</div>
    {development ? <Tabs value={tab} onValueChange={v => setParam('tab', v)} className="mt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><TabsList variant="line" aria-label="Visão do projeto"><TabsTrigger value="board">Quadro</TabsTrigger><TabsTrigger value="objectives">Objetivos</TabsTrigger></TabsList>
</div>
      <div className="mb-5 text-sm" aria-label="Contagens gerais do projeto">Geral: {s.completedObjectives}/{s.totalObjectives} objetivos concluídos · {s.nonCancelledTasks ? `${s.completedTasks}/${s.nonCancelledTasks} tarefas concluídas` : 'Nenhuma tarefa ativa'}{s.cancelledTasks ? ` · ${s.cancelledTasks} canceladas` : ''}</div>
      <TabsContent value="board"><div className="mb-4 flex flex-wrap gap-2">{mobile && <Button variant="outline" onClick={() => setShowFilters(true)}>Filtros{Object.keys(filters).length ? ` (${Object.keys(filters).length})` : ''}</Button>}
      {Object.keys(filters).length > 0 && <Button variant="ghost" onClick={clearFilters}>Limpar filtros</Button>}</div>
      {mobile ? <ResponsiveDialog open={showFilters} onOpenChange={setShowFilters} title="Filtros do quadro" className="max-sm:[&_button:not([role=checkbox])]:min-h-11" description="Combine objetivo, planejamento e prazo." footer={<Button onClick={() => setShowFilters(false)}>Aplicar filtros</Button>}><div className="flex flex-col gap-3">
        <WorkSelect label="Filtrar por objetivo" value={params.get('objective') ?? 'none'} onChange={v => setParam('objective', v)} options={[{ value: 'none', label: 'Todos os objetivos' }, ...(project.objectives ?? []).map(o => ({ value: String(o.id), label: o.title }))]} />
        <WorkSelect label="Filtrar planejamento" value={params.get('planning') ?? 'none'} onChange={v => setParam('planning', v)} options={[{ value: 'none', label: 'Qualquer planejamento' }, { value: 'today', label: 'Planejadas para hoje' }, { value: 'unscheduled', label: 'Sem planejamento' }]} />
        <Label className="flex min-h-11 items-center gap-2 font-normal leading-5"><Checkbox checked={!!filters.overdue} onCheckedChange={checked => setParam('overdue', checked === true ? '1' : '')} />Prazo ultrapassado</Label>
        <Label className="flex min-h-11 items-center gap-2 font-normal leading-5"><Checkbox checked={!!filters.open} onCheckedChange={checked => setParam('open', checked === true ? '1' : '')} />Somente abertas</Label></div></ResponsiveDialog> : <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <WorkSelect label="Filtrar por objetivo" value={params.get('objective') ?? 'none'} onChange={v => setParam('objective', v)} options={[{ value: 'none', label: 'Todos os objetivos' }, ...(project.objectives ?? []).map(o => ({ value: String(o.id), label: o.title }))]} />
        <WorkSelect label="Filtrar planejamento" value={params.get('planning') ?? 'none'} onChange={v => setParam('planning', v)} options={[{ value: 'none', label: 'Qualquer planejamento' }, { value: 'today', label: 'Planejadas para hoje' }, { value: 'unscheduled', label: 'Sem planejamento' }]} />
        <Label className="flex min-h-11 items-center gap-2 font-normal leading-5"><Checkbox checked={!!filters.overdue} onCheckedChange={checked => setParam('overdue', checked === true ? '1' : '')} />Prazo ultrapassado</Label>
        <Label className="flex min-h-11 items-center gap-2 font-normal leading-5"><Checkbox checked={!!filters.open} onCheckedChange={checked => setParam('open', checked === true ? '1' : '')} />Somente abertas</Label></div>}
      <WorkFeedback error={board.error} retry={() => void board.refetch()} />
      {board.isPending && <Skeleton className="h-64 w-full" />}
      {board.data && <><p className="mb-3 text-sm text-muted-foreground">{board.data.visible.totalTasks} de {board.data.total.totalTasks} tarefas visíveis</p><ProjectBoard board={board.data} pendingColumnId={project.defaultPendingColumnId!} onEdit={showTask} onAdd={columnId => setEditor({ columnId })} onObjective={objective => { setParams(previous => { const next = new URLSearchParams(previous); next.set('tab', 'objectives'); next.set('selectedObjective', String(objective)); return next; }); }} /></>}
      </TabsContent>
      <TabsContent value="objectives"><WorkFeedback error={allBoard.error} retry={() => void allBoard.refetch()} /><ProjectObjectives project={project} tasks={allBoard.data?.tasks} onAddTask={objectiveId => setEditor({ objectiveId, columnId: project.defaultPendingColumnId! })} onEditTask={showTask} selectedObjective={Number(params.get('selectedObjective')) || undefined} /></TabsContent>
    </Tabs> : <div className="mt-6 grid min-w-0 items-start gap-6 xl:grid-cols-project-detail">
      <ProjectObjectives project={project} onAddTask={() => {}} onEditTask={() => {}} />
      <aside className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 md:p-5" aria-label="Informações do projeto"><h2 className="text-base font-semibold">Resumo</h2><p className="text-sm">{s.totalObjectives ? `${s.completedObjectives}/${s.totalObjectives} objetivos concluídos` : 'Nenhum objetivo definido'}</p>
        {s.totalObjectives > 0 && <Progress value={Math.trunc(s.completedObjectives / s.totalObjectives * 100)} aria-label={`${Math.trunc(s.completedObjectives / s.totalObjectives * 100)}% dos objetivos concluídos`} />}
        <p className="text-sm">{s.overdueObjectiveCount} objetivos com prazo ultrapassado</p><h2 className="mt-2 text-base font-semibold">Calendário</h2><p className="text-sm text-muted-foreground">Prazos dos objetivos</p>
        <Calendar mode="multiple" selected={(project.objectives ?? []).map(o => parseLocalDate(o.dueDate)).filter((d): d is Date => !!d)} locale={ptBR} className="mx-auto max-w-full p-0" labels={{ labelPrevious: () => 'Mês anterior', labelNext: () => 'Próximo mês' }} />
        <Button variant="outline" onClick={() => setConverting(true)}>Usar quadro de tarefas</Button>
      </aside>
    </div>}
    <div className="mt-4"><WorkFeedback message={uploadError} />
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
    {editor && <TaskEditor open onOpenChange={v => { if (!v) setEditor(null); }} task={editor.task} projectId={project.id} columnId={editor.columnId} objectiveId={editor.objectiveId} />}
  </div>;
}
