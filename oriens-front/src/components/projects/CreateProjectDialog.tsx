import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DraftDialog } from '@/components/common/DraftDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useProjectWrites, useWorkProject } from '@/hooks/useWork';
import { useCreationAttempt } from '@/hooks/useCreationAttempt';
import { validCalendarDate } from '@/lib/work-form';
import type { WorkProject } from '@/types/work';

export function CreateProjectDialog({ open, onOpenChange, onSuccess, projectToEdit }: {
  open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; projectToEdit?: WorkProject | null;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [mode, setMode] = useState<WorkProject['mode']>('SIMPLE');
  const [objectives, setObjectives] = useState<{ title: string; dueDate: string }[]>([]);
  const [error, setError] = useState('');
  const [baseVersion, setBaseVersion] = useState(0);
  const write = useProjectWrites();
  const current = useWorkProject(projectToEdit?.id ?? 0);
  const [notice, setNotice] = useState('');
  const attempt = useCreationAttempt();
  useEffect(() => {
    if (!open) return;
    setTitle(projectToEdit?.title ?? ''); setDescription(projectToEdit?.description ?? '');
    setColor(projectToEdit?.color ?? ''); setMode(projectToEdit?.mode ?? 'SIMPLE');
    setNotice(''); setBaseVersion(projectToEdit?.version ?? 0); setObjectives([]); setError(''); write.reset(); attempt.reset();
    // A background refresh must never replace a draft or silently advance its version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectToEdit?.id]);
  const dirty = title !== (projectToEdit?.title ?? '') || description !== (projectToEdit?.description ?? '') ||
    color !== (projectToEdit?.color ?? '') || mode !== (projectToEdit?.mode ?? 'SIMPLE') || objectives.length > 0;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError('Informe o título do projeto.'); return; }
    if (objectives.some(o => !o.title.trim() || (o.dueDate && !validCalendarDate(o.dueDate)))) { setError('Preencha o nome e uma data válida para cada objetivo, ou remova a linha.'); return; }
    setError('');
    const metadata = { title: title.trim(), description: description.trim() || null, color: color || null };
    const body = { ...metadata, mode, objectives: objectives.map(o => ({ title: o.title.trim(), dueDate: o.dueDate || null })) };
    try {
      const saved = await write.mutateAsync(projectToEdit
        ? { action: 'metadata', id: projectToEdit.id, body: { ...metadata, version: baseVersion } }
        : { action: 'create', ...attempt.prepare(body) });
      toast.success(saved.refreshFailed ? 'Projeto salvo. Não foi possível atualizar as listas; recarregue os dados.' : 'Projeto salvo.');
      attempt.reset(); onSuccess(); onOpenChange(false);
    } catch (err) { if (!projectToEdit) attempt.failed(err); if (err instanceof Error && !('isAxiosError' in err)) setError(err.message); }
  }
  return <DraftDialog uncertain={attempt.uncertain} open={open} onOpenChange={onOpenChange} dirty={dirty} busy={write.isPending}
    title={projectToEdit ? 'Editar projeto' : 'Novo projeto'} description="Um contexto para seus objetivos e próximos passos."
    className="sm:max-w-[560px]" footer={<Button form="project-form" type="submit" disabled={write.isPending}>{write.isPending ? 'Salvando…' : projectToEdit ? 'Salvar alterações' : 'Criar Projeto'}</Button>}>
    <form id="project-form" onSubmit={submit} noValidate>
      <fieldset disabled={write.isPending || attempt.uncertain} className="min-w-0"><FieldGroup>
        {!projectToEdit && <Field><FieldLabel id="project-mode">Modo do projeto</FieldLabel>
          <RadioGroup aria-labelledby="project-mode" value={mode} onValueChange={v => setMode(v as WorkProject['mode'])}>
            <label className="flex items-start gap-3 rounded-md border p-3"><RadioGroupItem value="SIMPLE" /><span className="text-sm">Simples<span className="block text-muted-foreground">Acompanhe objetivos, sem configurar um quadro.</span></span></label>
            <label className="flex items-start gap-3 rounded-md border p-3"><RadioGroupItem value="DEVELOPMENT" /><span className="text-sm">Desenvolvimento<span className="block text-muted-foreground">Organize tarefas em A fazer, Fazendo e Concluídas.</span></span></label>
          </RadioGroup>
        </Field>}
        <Field data-invalid={!!error}><FieldLabel htmlFor="project-title">Título do Projeto</FieldLabel><Input id="project-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required aria-invalid={!!error} aria-describedby={error ? 'project-title-error' : undefined} />{error && <FieldError id="project-title-error">{error}</FieldError>}</Field>
        <Field><FieldLabel htmlFor="project-description">Descrição (opcional)</FieldLabel><Textarea id="project-description" value={description} onChange={e => setDescription(e.target.value)} maxLength={10000} /></Field>
        <Field><FieldLabel htmlFor="project-color">Cor (opcional)</FieldLabel><div className="flex items-center gap-3"><Input id="project-color" type="color" value={color || '#808080'} onChange={e => setColor(e.target.value)} className="h-11 w-14 p-1" /><Button type="button" variant="ghost" onClick={() => setColor('')}>Usar marca neutra</Button></div></Field>
        {!projectToEdit && <Field><FieldLabel>Objetivos (opcionais)</FieldLabel>
          {objectives.map((o, i) => <div key={i} className="flex flex-col gap-2 rounded-md border p-3">
            <Input aria-label={`Objetivo ${i + 1}`} value={o.title} maxLength={200} onChange={e => setObjectives(rows => rows.map((r, n) => n === i ? { ...r, title: e.target.value } : r))} />
            <Input aria-label={`Prazo do objetivo ${i + 1}`} type="date" value={o.dueDate} onChange={e => setObjectives(rows => rows.map((r, n) => n === i ? { ...r, dueDate: e.target.value } : r))} />
            <Button type="button" variant="ghost" onClick={() => setObjectives(rows => rows.filter((_, n) => n !== i))}>Remover objetivo</Button>
          </div>)}
          <Button type="button" variant="outline" onClick={() => setObjectives(rows => [...rows, { title: '', dueDate: '' }])}>Adicionar objetivo</Button>
        </Field>}
      </FieldGroup></fieldset>
      <div className="mt-4"><WorkFeedback message={notice} /><WorkFeedback error={write.error} retry={projectToEdit ? () => { void current.refetch().then(result => {
        if (result.data) { setBaseVersion(result.data.version); setNotice(`Dados recarregados. Nome atual no servidor: ${result.data.title}. Seu rascunho foi mantido; revise antes de salvar.`); write.reset(); }
      }); } : undefined} />{attempt.uncertain && <WorkFeedback message="Confirmação indisponível. Reenvie o mesmo pedido pelo botão de salvar para evitar duplicação." />}</div>
    </form>
  </DraftDialog>;
}
