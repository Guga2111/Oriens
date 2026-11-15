import { useState } from 'react';
import { ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { WorkDatePicker } from '@/components/common/WorkDatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DraftDialog } from '@/components/common/DraftDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useProjectWrites, useWorkProject } from '@/hooks/useWork';
import { useCreationAttempt } from '@/hooks/useCreationAttempt';
import { validCalendarDate } from '@/lib/work-form';
import { formatDue } from '@/lib/date';
import type { WorkObjective, WorkProject, WorkTask } from '@/types/work';

export function ProjectObjectives({ project, tasks, onAddTask, onEditTask, selectedObjective }: {
  project: WorkProject; tasks?: WorkTask[]; onAddTask: (id: number) => void; onEditTask: (t: WorkTask) => void; selectedObjective?: number;
}) {
  const objectives = project.objectives ?? [];
  const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [error, setError] = useState('');
  const write = useProjectWrites(); const attempt = useCreationAttempt();
  const pending = objectives.filter(o => o.status === 'PENDING'); const completed = objectives.filter(o => o.status === 'CONCLUDED');
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || (date && !validCalendarDate(date))) { setError('Informe o nome e um prazo válido, se houver.'); return; }
    const body = { projectVersion: project.version, title: title.trim(), dueDate: date || null };
    setError('');
    try { const result = await write.mutateAsync({ action: 'objective-create', id: project.id, ...attempt.prepare(body) });
      setTitle(''); setDate(''); attempt.reset(); toast.success(result.refreshFailed ? 'Objetivo criado. Recarregue os dados.' : 'Objetivo criado.');
    } catch (err) { attempt.failed(err); }
  }
  return <section aria-labelledby="objectives-title" className="min-w-0 rounded-lg border bg-card p-4 max-sm:[&_button:not([role=checkbox])]:min-h-11 max-sm:[&_input]:min-h-11 md:p-5">
    <h2 id="objectives-title" className="mb-4 text-base font-semibold">Objetivos</h2>
    <form onSubmit={add} className="mb-5"><fieldset disabled={write.isPending || attempt.uncertain}><FieldGroup className="grid gap-4 lg:grid-cols-2">
      <Field><FieldLabel htmlFor="new-objective">Novo objetivo</FieldLabel><Input id="new-objective" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} /></Field>
      <div className="flex flex-wrap items-end gap-3"><Field className="min-w-0 flex-1"><FieldLabel htmlFor="new-objective-date">Prazo do objetivo (opcional)</FieldLabel><WorkDatePicker id="new-objective-date" label="Prazo do objetivo" value={date} onChange={setDate} /></Field></div>
    </FieldGroup></fieldset><Button className="mt-3" type="submit" disabled={write.isPending}><Plus aria-hidden />Adicionar objetivo</Button></form>
    <WorkFeedback message={error || (attempt.uncertain ? 'Confirmação indisponível. Reenvie o mesmo objetivo para evitar duplicação.' : '')} error={write.error} />
    <Tabs defaultValue={objectives.find(o => o.id === selectedObjective)?.status === 'CONCLUDED' ? 'completed' : 'pending'}>
      <TabsList variant="line" className="my-4" aria-label="Estado dos objetivos"><TabsTrigger value="pending">A fazer ({pending.length})</TabsTrigger><TabsTrigger value="completed">Concluídos ({completed.length})</TabsTrigger></TabsList>
      {[{ value: 'pending', rows: pending }, { value: 'completed', rows: completed }].map(group => <TabsContent value={group.value} key={group.value}>
        {group.rows.length === 0 ? <p className="py-4 text-sm text-muted-foreground">{objectives.length ? 'Nenhum objetivo neste estado.' : 'Nenhum objetivo definido. Adicione o primeiro acima.'}</p> : <ul className="flex flex-col gap-3">{group.rows.map(o => <ObjectiveRow key={o.id} objective={o} project={project} tasks={tasks?.filter(t => t.objectiveId === o.id)} onAddTask={onAddTask} onEditTask={onEditTask} expanded={selectedObjective === o.id} />)}</ul>}
      </TabsContent>)}
    </Tabs>
  </section>;
}
function ObjectiveRow({ objective: o, project, tasks, onAddTask, onEditTask, expanded }: {
  objective: WorkObjective; project: WorkProject; tasks?: WorkTask[]; onAddTask: (id: number) => void; onEditTask: (t: WorkTask) => void; expanded: boolean;
}) {
  const write = useProjectWrites();
  const current = useWorkProject(project.id);
  const [edit, setEdit] = useState(false); const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState({ title: o.title, date: o.dueDate ?? '', version: o.version }); const [validation, setValidation] = useState('');
  const [showTasks, setShowTasks] = useState(expanded);
  const development = project.mode === 'DEVELOPMENT';
  async function execute(command: Parameters<typeof write.mutateAsync>[0]) {
    const result = await write.mutateAsync(command);
    toast.success(result.refreshFailed ? 'Salvo. Recarregue os dados.' : 'Objetivo atualizado.');
  }
  return <li id={`objective-${o.id}`} className="min-w-0 rounded-md bg-muted/30 p-3">
    <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center"><Checkbox className="task-completion" disabled={write.isPending} checked={o.status === 'CONCLUDED'} aria-label={`${o.status === 'CONCLUDED' ? 'Reabrir' : 'Concluir manualmente'} objetivo ${o.title}`}
      onCheckedChange={() => void execute({ action: 'objective-patch', id: project.id, objectiveId: o.id, body: { version: o.version, status: o.status === 'CONCLUDED' ? 'PENDING' : 'CONCLUDED' } }).catch(() => {})} /></div>
      <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{o.title}</p><p className="mt-1 text-sm text-muted-foreground">{o.dueDate ? `Prazo: ${formatDue(o.dueDate)}` : 'Sem prazo'}</p>
        {development && <p className="mt-1 text-sm">{o.nonCancelledTasks ? `${o.completedTasks}/${o.nonCancelledTasks} tarefas concluídas` : 'Nenhuma tarefa vinculada'}{o.cancelledTasks ? ` · ${o.cancelledTasks} canceladas` : ''}</p>}
        {o.status === 'PENDING' && (o.nonCancelledTasks ?? 0) > 0 && o.completedTasks === o.nonCancelledTasks && <p className="mt-2 text-sm">As tarefas terminaram. O resultado foi alcançado? Você pode concluir o objetivo manualmente.</p>}
      </div>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={write.isPending} aria-label={`Ações do objetivo ${o.title}`}><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => { setDraft({ title: o.title, date: o.dueDate ?? '', version: o.version }); setValidation(''); write.reset(); setEdit(true); }}><Pencil aria-hidden />Editar objetivo</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(true)}><Trash2 aria-hidden />Excluir objetivo</DropdownMenuItem>
        </DropdownMenuGroup></DropdownMenuContent>
      </DropdownMenu></div>
    {development && <Collapsible open={showTasks} onOpenChange={setShowTasks}>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onAddTask(o.id)}><Plus aria-hidden />Adicionar tarefa</Button>
        <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><ChevronDown aria-hidden />{showTasks ? 'Ocultar tarefas vinculadas' : 'Ver tarefas vinculadas'}</Button></CollapsibleTrigger>
      </div>
      <CollapsibleContent><div className="mt-3 flex flex-col gap-2">{tasks ? tasks.length ? tasks.map(t => <Button key={t.id} variant="ghost" className="h-auto min-h-11 justify-start whitespace-normal text-left" onClick={() => onEditTask(t)}>{t.title}</Button>) : <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada.</p> : <p className="text-sm">Tarefas indisponíveis; tente recarregar o quadro.</p>}</div></CollapsibleContent>
    </Collapsible>}
    {!edit && <WorkFeedback error={write.error} />}
    <DraftDialog open={edit} onOpenChange={setEdit} dirty={draft.title !== o.title || draft.date !== (o.dueDate ?? '')} busy={write.isPending} title="Editar objetivo" description="Editar nome ou prazo preserva a conclusão manual."
      footer={<Button type="submit" form={`objective-form-${o.id}`} disabled={write.isPending}>Salvar objetivo</Button>}>
      <form id={`objective-form-${o.id}`} onSubmit={async e => { e.preventDefault(); if (!draft.title.trim() || (draft.date && !validCalendarDate(draft.date))) { setValidation('Informe nome e prazo válidos.'); return; }
        try { await execute({ action: 'objective-patch', id: project.id, objectiveId: o.id, body: { version: draft.version, title: draft.title.trim(), dueDate: draft.date || null } }); setEdit(false); } catch { /* Keep draft. */ }
      }}><FieldGroup><Field><FieldLabel htmlFor={`objective-title-${o.id}`}>Título do objetivo</FieldLabel><Input id={`objective-title-${o.id}`} maxLength={200} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} /></Field>
        <Field><FieldLabel htmlFor={`objective-date-${o.id}`}>Prazo do objetivo</FieldLabel><WorkDatePicker id={`objective-date-${o.id}`} label="Prazo do objetivo" value={draft.date} onChange={value => setDraft(d => ({ ...d, date: value }))} /></Field>
        <WorkFeedback message={validation} error={write.error} retry={() => { void current.refetch().then(result => {
          const fresh = result.data?.objectives?.find(row => row.id === o.id);
          if (fresh) { setDraft(d => ({ ...d, version: fresh.version })); setValidation(`Dados recarregados. Nome atual: ${fresh.title}. Revise o rascunho preservado antes de salvar.`); write.reset(); }
        }); }} />
      </FieldGroup></form>
    </DraftDialog>
    <ConfirmDialog error={write.error} open={deleting} onOpenChange={setDeleting} title="Excluir objetivo?" objectName={o.title} confirmLabel="Excluir objetivo"
      description={`Excluir ${o.title}? As tarefas serão preservadas no mesmo projeto e coluna, sem vínculo com este objetivo.`}
      onConfirm={async () => { try { await execute({ action: 'objective-delete', id: project.id, objective: o, projectVersion: project.version }); setDeleting(false); return true; } catch { return false; } }} />
  </li>;
}
