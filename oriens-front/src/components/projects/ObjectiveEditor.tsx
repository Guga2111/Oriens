import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { DraftDialog } from '@/components/common/DraftDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ObjectivePeriodFields, ObjectiveStatusPicker } from './ObjectiveProperties';
import { useCreationAttempt } from '@/hooks/useCreationAttempt';
import { useProjectWrites, useWorkProject } from '@/hooks/useWork';
import type { ObjectiveStatus } from '@/lib/objectives';
import { validCalendarDate } from '@/lib/work-form';
import type { WorkObjective, WorkProject } from '@/types/work';

type Draft = { title: string; description: string; startDate: string; dueDate: string; status: ObjectiveStatus };
const emptyDraft: Draft = { title: '', description: '', startDate: '', dueDate: '', status: 'BACKLOG' };
const draftOf = (o: WorkObjective): Draft => ({ title: o.title, description: o.description ?? '', startDate: o.startDate ?? '', dueDate: o.dueDate ?? '', status: o.status });
const sameDraft = (left: Draft, right: Draft) => Object.keys(left).every(key => left[key as keyof Draft] === right[key as keyof Draft]);
function validate(draft: Draft) {
  if (!draft.title.trim()) return 'Informe o título do objetivo.';
  if ([draft.startDate, draft.dueDate].some(date => date && !validCalendarDate(date))) return 'Informe datas válidas.';
  if (draft.startDate && draft.dueDate && draft.startDate > draft.dueDate) return 'O término deve ser igual ou posterior ao início.';
  return '';
}
function ObjectiveFields({ id, draft, onChange, disabled, error, autoFocus = false }: {
  id: string; draft: Draft; onChange: (draft: Draft) => void; disabled: boolean; error: string; autoFocus?: boolean;
}) {
  return <FieldGroup>
    <Field data-invalid={!!error || undefined}><FieldLabel htmlFor={`${id}-title`}>Título do objetivo</FieldLabel>
      <Input id={`${id}-title`} value={draft.title} autoFocus={autoFocus} maxLength={200} disabled={disabled} aria-invalid={!!error || undefined} onChange={e => onChange({ ...draft, title: e.target.value })} />
      {error && <FieldError>{error}</FieldError>}
    </Field>
    <Field><FieldLabel htmlFor={`${id}-description`}>Descrição</FieldLabel>
      <Textarea id={`${id}-description`} placeholder="Descreva o resultado que você quer alcançar…" rows={4} maxLength={10000} value={draft.description} disabled={disabled} onChange={e => onChange({ ...draft, description: e.target.value })} />
    </Field>
    <Field><FieldLabel>Status</FieldLabel><div><ObjectiveStatusPicker value={draft.status} disabled={disabled} onChange={status => onChange({ ...draft, status })} /></div></Field>
    <ObjectivePeriodFields id={id} start={draft.startDate} end={draft.dueDate} disabled={disabled} onChange={(startDate, dueDate) => onChange({ ...draft, startDate, dueDate })} />
  </FieldGroup>;
}

export function CreateObjectiveDialog({ project, onClose }: { project: WorkProject; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState('');
  const write = useProjectWrites();
  const attempt = useCreationAttempt();
  async function create(event: FormEvent) {
    event.preventDefault();
    const validation = validate(draft); setError(validation); if (validation) return;
    const body = { projectVersion: project.version, title: draft.title.trim(), description: draft.description.trim() || null,
      startDate: draft.startDate || null, dueDate: draft.dueDate || null, status: draft.status };
    try {
      const result = await write.mutateAsync({ action: 'objective-create', id: project.id, ...attempt.prepare(body) });
      toast.success(result.refreshFailed ? 'Objetivo criado. Recarregue os dados.' : 'Objetivo criado.');
      attempt.reset(); onClose();
    } catch (err) { attempt.failed(err); }
  }
  return <DraftDialog open onOpenChange={open => { if (!open) onClose(); }} title="Novo objetivo" description="Defina o resultado e, se quiser, uma descrição e um período."
    dirty={!sameDraft(draft, emptyDraft)} busy={write.isPending} uncertain={attempt.uncertain}
    footer={<Button type="submit" form="create-objective-form" disabled={write.isPending}>{attempt.uncertain ? 'Reenviar objetivo' : 'Criar objetivo'}</Button>}>
    <form id="create-objective-form" onSubmit={create}>
      <ObjectiveFields id="new-objective" autoFocus draft={draft} onChange={setDraft} disabled={write.isPending || attempt.uncertain} error={error} />
      <WorkFeedback error={write.error} message={attempt.uncertain ? 'Confirmação indisponível. Reenvie o mesmo objetivo para evitar duplicação.' : ''} />
    </form>
  </DraftDialog>;
}

export function EditObjectiveDialog({ objective, project, onClose }: {
  objective: WorkObjective; project: WorkProject; onClose: () => void;
}) {
  const [base, setBase] = useState(objective);
  const [draft, setDraft] = useState(() => draftOf(objective));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const write = useProjectWrites();
  const current = useWorkProject(project.id);
  const dirty = !sameDraft(draft, draftOf(base));
  if (objective.version !== base.version && !dirty) { setBase(objective); setDraft(draftOf(objective)); }
  async function save(event: FormEvent) {
    event.preventDefault();
    const validation = validate(draft); setError(validation); if (validation) return;
    const body: Extract<Parameters<typeof write.mutateAsync>[0], { action: 'objective-patch' }>['body'] = { version: base.version };
    if (draft.title !== base.title) body.title = draft.title.trim();
    if (draft.description !== (base.description ?? '')) body.description = draft.description.trim() || null;
    if (draft.startDate !== (base.startDate ?? '')) body.startDate = draft.startDate || null;
    if (draft.dueDate !== (base.dueDate ?? '')) body.dueDate = draft.dueDate || null;
    if (draft.status !== base.status) body.status = draft.status;
    try {
      const result = await write.mutateAsync({ action: 'objective-patch', id: project.id, objectiveId: objective.id, body });
      toast.success(result.refreshFailed ? 'Salvo. Recarregue os dados.' : 'Objetivo atualizado.'); onClose();
    } catch { /* The draft and its original version remain available for review. */ }
  }
  return <DraftDialog open onOpenChange={open => { if (!open) onClose(); }} title="Editar objetivo" description="Altere os dados do objetivo. A conclusão continua sendo manual."
    dirty={dirty} busy={write.isPending} footer={<Button type="submit" form={`objective-form-${objective.id}`} disabled={write.isPending || !dirty}>Salvar objetivo</Button>}>
    <form id={`objective-form-${objective.id}`} onSubmit={save}>
      <ObjectiveFields id={`objective-${objective.id}`} autoFocus draft={draft} onChange={setDraft} disabled={write.isPending} error={error} />
      <WorkFeedback message={notice} error={write.error} retry={() => { void current.refetch().then(result => {
        const fresh = result.data?.objectives?.find(row => row.id === objective.id);
        if (fresh) { setBase(fresh); setNotice(`Dados recarregados. Título atual: ${fresh.title}. Revise o rascunho preservado antes de salvar.`); write.reset(); }
      }); }} />
    </form>
  </DraftDialog>;
}
