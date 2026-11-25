import { useRecordVisit } from '@/hooks/useHome';
import { useEffect, useRef, useState } from 'react';
import { TaskLabelPicker } from './TaskLabelPicker';
import { Clock, X } from 'lucide-react';
import { WorkDatePicker } from '@/components/common/WorkDatePicker';
import { WorkCombobox } from '@/components/common/WorkCombobox';
import { toast } from 'sonner';
import { taskService } from '@/services/taskService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel, FieldError, FieldSet, FieldLegend, FieldDescription } from '@/components/ui/field';
import { DraftDialog } from '@/components/common/DraftDialog';
import { WorkSelect } from '@/components/common/WorkSelect';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { LocationInput } from '@/components/common/LocationInput';
import { useGoogleMapsScript } from '@/hooks/useGoogleMapsScript';
import { usePlanningCount, useProjectBoard, useTaskWrites, useWorkProject, useWorkProjects } from '@/hooks/useWork';
import { useCreationAttempt } from '@/hooks/useCreationAttempt';
import { validCalendarDate, statusNames } from '@/lib/work-form';
import { PRIORITY, PRIORITY_ORDER } from '@/lib/labels';
import type { LocationDTO, TaskPriority } from '@/types/task';
import type { TaskCreation, TaskPatch, WorkTask } from '@/types/work';

interface Draft { labelIds: number[]; title: string; description: string; projectId: number | null; objectiveId: number | null; columnId: number | null; plannedDate: string; startTime: string; dueDate: string; priority: TaskPriority; location: LocationDTO | null }
export interface TaskEditorProps {
  open: boolean; onOpenChange: (open: boolean) => void; onSaved?: () => void; task?: WorkTask;
  projectId?: number; objectiveId?: number; columnId?: number; plannedDate?: string; startTime?: string;
}
const libraries = ['places'];
export function TaskEditor(props: TaskEditorProps) {
  // Unmount the form at close: reopen starts from a fresh server snapshot, never a background refetch.
  return props.open ? <TaskEditorForm {...props} /> : null;
}
function TaskEditorForm({ open, onOpenChange, onSaved, task, ...defaults }: TaskEditorProps) {
  const [base, setBase] = useState(task);
  useRecordVisit('TASK', task?.id);
  const initial: Draft = { labelIds: (task?.labels ?? []).map(label => label.id).sort((a, b) => a - b), title: task?.title ?? '', description: task?.description ?? '',
    projectId: task?.projectId ?? defaults.projectId ?? null, objectiveId: task?.objectiveId ?? defaults.objectiveId ?? null,
    columnId: task?.columnId ?? defaults.columnId ?? null, plannedDate: task?.plannedDate ?? defaults.plannedDate ?? '',
    startTime: (task?.startTime ?? defaults.startTime ?? '').slice(0, 5), dueDate: task?.dueDate ?? '', priority: task?.priority ?? 'NONE', location: task?.location ?? null };
  const [draft, setDraft] = useState<Draft>(initial);
  const [original, setOriginal] = useState(JSON.stringify(initial));
  const titleInput = useRef<HTMLInputElement>(null);
  const autoDestination = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [targetVersion, setTargetVersion] = useState<number | null>(null);
  const project = useWorkProject(draft.projectId ?? 0);
  const board = useProjectBoard(draft.projectId ?? 0);
  const choices = useWorkProjects({ size: 100, includeArchived: true, search: search || undefined });
  const count = usePlanningCount(draft.plannedDate, task?.id);
  const writes = useTaskWrites(); const attempt = useCreationAttempt();
  const { isLoaded, loadError } = useGoogleMapsScript({ apiKey: import.meta.env.VITE_PUBLIC_GOOGLE_MAPS_API_KEY || '', libraries });
  const pending = writes.create.isPending || writes.patch.isPending;
  const change = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft(d => ({ ...d, [field]: value }));
  useEffect(() => {
    if (project.data && targetVersion === null) setTargetVersion(project.data.version);
  }, [project.data, targetVersion]);
  // Creation from an objective uses its project's default pending destination.
  useEffect(() => {
    if (!autoDestination.current && !task && defaults.projectId === draft.projectId && !draft.columnId && project.data?.defaultPendingColumnId) {
      autoDestination.current = true;
      const columnId = project.data.defaultPendingColumnId;
      change('columnId', columnId);
      setOriginal(previous => JSON.stringify({ ...JSON.parse(previous), columnId }));
    }
  }, [task, draft.projectId, defaults.projectId, draft.columnId, project.data?.defaultPendingColumnId]);
  const destination = board.data?.columns.find(c => c.id === draft.columnId);
  const activeProject = project.data;
  const selectedChoices = choices.data?.content.filter(p => p.mode === 'DEVELOPMENT') ?? [];
  const projectOptions = [{ value: 'none', label: 'Tarefa avulsa' }, ...selectedChoices.map(p => ({ value: String(p.id), label: p.title + (p.archived ? ' · Arquivado' : '') }))];
  if (draft.projectId && !projectOptions.some(o => o.value === String(draft.projectId))) projectOptions.push({ value: String(draft.projectId), label: activeProject?.title ?? task?.project?.title ?? 'Projeto selecionado' });
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!draft.title.trim()) {
      setError('Informe o título da tarefa.');
      titleInput.current?.focus();
      return;
    }
    if ([draft.plannedDate, draft.dueDate].some(d => d && !validCalendarDate(d))) { setError('Informe datas de calendário válidas.'); return; }
    if (draft.startTime && (!draft.plannedDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime))) { setError('Horário válido exige um dia planejado.'); return; }
    if (draft.projectId && (!destination || activeProject?.mode !== 'DEVELOPMENT' || targetVersion === null)) { setError('Escolha uma coluna válida no projeto de destino.'); return; }
    const common = { title: draft.title.trim(), description: draft.description.trim() || null,
      plannedDate: draft.plannedDate || null, startTime: draft.startTime ? `${draft.startTime}:00` : null,
      labelIds: draft.labelIds, dueDate: draft.dueDate || null, priority: draft.priority, location: draft.location };
    try {
      let result;
      if (base) {
        const body: TaskPatch = { ...common, version: base.version };
        if (base.projectId) body.projectVersion = base.project!.version;
        if (draft.projectId !== base.projectId) {
          body.projectId = draft.projectId;
          if (draft.projectId) {
            if (base.projectId) body.targetProjectVersion = targetVersion!; else body.projectVersion = targetVersion!;
          }
        }
        if (draft.projectId) {
          if (draft.projectId !== base.projectId || draft.columnId !== base.columnId) body.columnId = draft.columnId!;
          if (draft.projectId !== base.projectId || draft.objectiveId !== base.objectiveId) body.objectiveId = draft.objectiveId;
        }
        result = await writes.patch.mutateAsync({ id: base.id, body });
      } else {
        const body: TaskCreation = { ...common, ...(draft.projectId ? { projectId: draft.projectId, projectVersion: targetVersion!, columnId: draft.columnId!, objectiveId: draft.objectiveId } : {}) };
        result = await writes.create.mutateAsync({ ...attempt.prepare(body) });
      }
      toast.success(result.refreshFailed ? 'Tarefa salva. Recarregue as listas para atualizar os dados.' : 'Tarefa salva.');
      attempt.reset(); onSaved?.(); onOpenChange(false);
    } catch (err) { if (!base) attempt.failed(err); if (err instanceof Error && !('isAxiosError' in err)) setError(err.message); }
  }
  async function reload() {
    // Refresh preconditions explicitly, keeping every draft field visible for review.
    if (base) {
      try { setBase(await taskService.task(base.id)); } catch { setError('Não foi possível recarregar a tarefa.'); return; }
    }
    if (draft.projectId) {
      const result = await project.refetch(); if (result.data) setTargetVersion(result.data.version);
      await board.refetch();
    } setNotice('Dados recarregados. Revise o rascunho e o destino antes de salvar novamente.');
    writes.patch.reset(); writes.create.reset();
  }
  return <DraftDialog uncertain={attempt.uncertain} open={open} onOpenChange={onOpenChange} dirty={JSON.stringify(draft) !== original} busy={pending}
    title={base ? 'Editar tarefa' : 'Nova tarefa'} description="Planejamento e prazo final são independentes."
    className="sm:max-w-task-dialog" footer={<Button form="task-editor" type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar tarefa'}</Button>}>
    <form id="task-editor" onSubmit={save} noValidate><fieldset disabled={pending || attempt.uncertain} className="min-w-0"><FieldGroup className="gap-6">
      <FieldGroup className="gap-4">
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="task-title">Título</FieldLabel>
        <Input
          ref={titleInput}
          id="task-title"
          value={draft.title}
          onChange={e => change('title', e.target.value)}
          maxLength={200}
          required
          aria-invalid={!!error}
          aria-describedby={error ? 'task-validation' : undefined}
        />
        {error && <FieldError id="task-validation">{error}</FieldError>}
      </Field>
      <Field><FieldLabel htmlFor="task-description">Descrição (opcional)</FieldLabel><Textarea id="task-description" value={draft.description} maxLength={10000} onChange={e => change('description', e.target.value)} /></Field>
      <Field><FieldLabel htmlFor="task-labels">Etiquetas</FieldLabel><TaskLabelPicker value={draft.labelIds} onChange={ids => change('labelIds', ids)} onCatalogDelete={id => setOriginal(previous => { const saved: Draft = JSON.parse(previous); return JSON.stringify({ ...saved, labelIds: saved.labelIds.filter(current => current !== id) }); })} disabled={pending || attempt.uncertain} /></Field>
      </FieldGroup>
      <FieldSet className="gap-3"><FieldLegend>Projeto e objetivo</FieldLegend><FieldGroup className="gap-4">
      <Field><FieldLabel htmlFor="task-project">Projeto</FieldLabel><WorkCombobox id="task-project" search={search} onSearchChange={setSearch} loading={choices.isFetching} label="Projeto da tarefa" value={String(draft.projectId ?? 'none')} options={projectOptions} onChange={v => {
        const next = v === 'none' ? null : Number(v);
        if (next === draft.projectId) return;
        setDraft(d => ({ ...d, projectId: next, objectiveId: null, columnId: null })); setTargetVersion(null);
        setNotice(next ? 'O objetivo anterior foi removido. Escolha a coluna de destino e confira o estado antes de salvar.' : 'A tarefa ficará avulsa, mantendo seu estado. Objetivo e coluna serão removidos.');
      }} /><WorkFeedback error={choices.error} retry={() => void choices.refetch()} />{(choices.data?.totalElements ?? 0) > 100 && <p className="text-sm text-muted-foreground">Refine a busca para encontrar outros projetos.</p>}</Field>
      {draft.projectId && <><WorkFeedback error={project.error || board.error} retry={() => { void project.refetch(); void board.refetch(); }} />
        <FieldGroup className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel>Objetivo (opcional)</FieldLabel><WorkSelect label="Objetivo da tarefa" disabled={!activeProject} value={String(draft.objectiveId ?? 'none')} options={[{ value: 'none', label: 'Sem objetivo' }, ...(activeProject?.objectives ?? []).map(o => ({ value: String(o.id), label: o.title }))]} onChange={v => change('objectiveId', v === 'none' ? null : Number(v))} /></Field>
        <Field><FieldLabel>Coluna de destino</FieldLabel><WorkSelect label="Coluna de destino" value={String(draft.columnId ?? 'none')} options={[{ value: 'none', label: 'Escolha a coluna' }, ...(board.data?.columns ?? []).map(c => ({ value: String(c.id), label: `${c.name} · ${statusNames[c.kind]}` }))]} onChange={v => change('columnId', v === 'none' ? null : Number(v))} />
          {destination && <p className="text-sm">Estado ao salvar: {statusNames[destination.kind]}</p>}
        </Field></FieldGroup></>}
      </FieldGroup></FieldSet>
      <FieldSet className="gap-3"><FieldLegend>Planejamento</FieldLegend><FieldDescription>Quando você pretende fazer esta tarefa.</FieldDescription><FieldGroup className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field><FieldLabel htmlFor="task-planned">Dia planejado</FieldLabel><WorkDatePicker id="task-planned" label="Dia planejado" value={draft.plannedDate} onChange={value => setDraft(d => ({ ...d, plannedDate: value, startTime: value ? d.startTime : '' }))} /></Field>
        <Field><FieldLabel htmlFor="task-time">Horário (HH:mm)</FieldLabel><div className="flex items-center gap-1"><div className="relative min-w-0 flex-1"><Clock aria-hidden className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="task-time" type="text" inputMode="numeric" placeholder="Ex.: 09:30" maxLength={5} className="pl-9" value={draft.startTime} disabled={!draft.plannedDate} onChange={e => change('startTime', e.target.value)} /></div>{draft.startTime && <Button type="button" variant="ghost" size="icon" aria-label="Limpar horário" onClick={() => change('startTime', '')}><X aria-hidden /></Button>}</div></Field>
      </FieldGroup>
      {draft.plannedDate && <p className="text-sm text-muted-foreground" role="status">{count.data ? `${count.data.activeCount} outras tarefas ativas planejadas · ${count.data.completedCount} concluídas` : count.isError ? 'Quantidade planejada indisponível. Você pode salvar.' : 'Consultando planejamento…'}</p>}
      </FieldSet>
      <FieldSet className="gap-3"><FieldLegend>Prazo e detalhes</FieldLegend><FieldGroup className="grid gap-4 sm:grid-cols-2">
      <Field><FieldLabel htmlFor="task-due">Prazo final (opcional)</FieldLabel><WorkDatePicker id="task-due" label="Prazo final" value={draft.dueDate} onChange={value => change('dueDate', value)} /><FieldDescription>Até quando a tarefa precisa estar pronta.</FieldDescription></Field>
      {draft.plannedDate && draft.dueDate && draft.plannedDate > draft.dueDate && <WorkFeedback message="O dia planejado é posterior ao prazo final. Você pode salvar assim." />}
      <Field><FieldLabel>Prioridade</FieldLabel><WorkSelect label="Prioridade" value={draft.priority} options={PRIORITY_ORDER.map(value => ({ value, label: PRIORITY[value].label }))} onChange={v => change('priority', v as TaskPriority)} /></Field>
      <Field className="sm:col-span-2"><FieldLabel htmlFor="task-address">Localização (opcional)</FieldLabel><Input id="task-address" value={draft.location?.address ?? ''} onChange={e => change('location', e.target.value ? { address: e.target.value } : null)} />
        {isLoaded && <LocationInput id="task-place-search" aria-label="Buscar endereço no mapa" isLoaded={isLoaded} onPlaceSelect={v => change('location', v)} />}
        {loadError && <p className="text-sm text-muted-foreground">Busca no mapa indisponível. Você pode informar o endereço acima.</p>}
        {draft.location && <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => change('location', null)}><X aria-hidden />Remover localização</Button>}
      </Field>
    </FieldGroup></FieldSet></FieldGroup></fieldset><div className="mt-4 flex flex-col gap-3"><WorkFeedback message={notice} /><WorkFeedback error={writes.patch.error || writes.create.error} retry={() => void reload()} />{attempt.uncertain && <WorkFeedback message="Confirmação indisponível. Reenvie o mesmo pedido pelo botão de salvar; os campos estão preservados." />}</div></form>
  </DraftDialog>;
}
