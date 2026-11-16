import { useId, useState } from 'react';
import { Pencil, Plus, Save, Tags, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DraftDialog } from '@/components/common/DraftDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { useCreationAttempt } from '@/hooks/useCreationAttempt';
import { useTaskLabels, useTaskLabelWrites } from '@/hooks/useTaskLabels';
import { TaskLabelBadge } from './TaskLabels';
import { LABEL_COLORS } from '@/lib/task-labels';
import { TASK_LABEL_COLORS, type TaskLabel, type TaskLabelColor } from '@/types/task-label';

export function TaskLabelPicker({ value, onChange, disabled, onCatalogDelete }: {
  value: number[]; onChange: (ids: number[]) => void; disabled?: boolean; onCatalogDelete?: (id: number) => void;
}) {
  const catalog = useTaskLabels();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ label?: TaskLabel } | null>(null);
  const prefix = useId();
  const labels = catalog.data ?? [];
  const visible = labels.filter(label => label.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const missing = value.filter(id => catalog.data && !labels.some(label => label.id === id));
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter(current => current !== id) : [...value, id].sort((a, b) => a - b));
  }
  return <div className="flex min-w-0 flex-col gap-3">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button id="task-labels" type="button" variant="outline" className="w-full justify-start" disabled={disabled}><Tags aria-hidden />{value.length ? `Etiquetas (${value.length})` : 'Adicionar etiquetas'}</Button></PopoverTrigger>
      <PopoverContent align="start" className="w-popover-trigger p-3" onCloseAutoFocus={event => { if (editor) event.preventDefault(); }}>
        <div className="flex min-w-0 flex-col gap-3">
          <Input aria-label="Buscar etiquetas da conta" placeholder="Buscar etiquetas…" value={search} onChange={e => setSearch(e.target.value)} />
          <WorkFeedback error={catalog.error} retry={() => void catalog.refetch()} />
          {catalog.isPending ? <p role="status" className="text-sm text-muted-foreground">Carregando etiquetas…</p> : <ScrollArea className="max-h-64">
            <FieldSet className="gap-2"><FieldLegend className="sr-only">Etiquetas da conta</FieldLegend>
              {visible.map(label => <div key={label.id} className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1">
                <Label htmlFor={`${prefix}-${label.id}`} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-2">
                  <Checkbox id={`${prefix}-${label.id}`} checked={value.includes(label.id)} disabled={disabled || value.length >= 20 && !value.includes(label.id)} onCheckedChange={() => toggle(label.id)} />
                  <TaskLabelBadge label={label} />
                </Label>
                <Button type="button" variant="ghost" size="icon" aria-label={`Editar etiqueta ${label.name}`} disabled={disabled} onClick={() => { setOpen(false); setEditor({ label }); }}><Pencil aria-hidden /></Button>
              </div>)}
              {!visible.length && <p className="py-3 text-sm text-muted-foreground">{search ? 'Nenhuma etiqueta encontrada.' : 'Nenhuma etiqueta na conta. Crie a primeira abaixo.'}</p>}
            </FieldSet>
          </ScrollArea>}
          <Button type="button" variant="outline" disabled={disabled || catalog.isError} onClick={() => { setOpen(false); setEditor({}); }}><Plus aria-hidden />Criar etiqueta</Button>
          <p className="text-xs text-muted-foreground">Disponíveis em todos os seus projetos e tarefas avulsas.</p>
        </div>
      </PopoverContent>
    </Popover>
    {value.length > 0 && <ul aria-label="Etiquetas selecionadas" className="flex min-w-0 flex-wrap gap-2">{value.map(id => {
      const label = labels.find(row => row.id === id);
      return <li key={id} className="flex min-w-0 max-w-full items-center gap-1">{label ? <TaskLabelBadge label={label} /> : <Badge variant="outline">{catalog.isPending ? 'Carregando…' : 'Etiqueta indisponível'}</Badge>}
        <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Remover etiqueta ${label?.name ?? 'indisponível'} desta tarefa`} onClick={() => toggle(id)}><X aria-hidden /></Button>
      </li>;
    })}</ul>}
    {missing.length > 0 && <WorkFeedback message="Uma etiqueta selecionada foi excluída da conta. Remova-a desta tarefa antes de salvar." />}
    {value.length >= 20 && <p className="text-xs text-muted-foreground">Limite de 20 etiquetas por tarefa.</p>}
    {editor && <LabelEditor key={editor.label?.id ?? 'new'} label={editor.label} onClose={() => setEditor(null)} onDeleted={id => { onChange(value.filter(current => current !== id)); onCatalogDelete?.(id); }} onCreated={label => { if (value.length < 20) onChange([...new Set([...value, label.id])].sort((a, b) => a - b)); }} />}
  </div>;
}

function LabelEditor({ label, onClose, onCreated, onDeleted }: { label?: TaskLabel; onClose: () => void; onCreated: (label: TaskLabel) => void; onDeleted: (id: number) => void }) {
  const [base, setBase] = useState(label);
  const [name, setName] = useState(label?.name ?? '');
  const [color, setColor] = useState<TaskLabelColor>(label?.color ?? 'BLUE');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(false);
  const write = useTaskLabelWrites(); const catalog = useTaskLabels(); const attempt = useCreationAttempt();
  const formId = useId();
  async function save(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation(); // This dialog is a React portal inside the task form.
    if (!name.trim()) { setError('Informe o nome da etiqueta.'); return; }
    setError('');
    const body = { name: name.trim(), color };
    try {
      const result = await write.mutateAsync(base ? { action: 'update', label: base, body } : { action: 'create', ...attempt.prepare(body) });
      if (!base && result.label) onCreated(result.label);
      toast.success(result.refreshFailed ? 'Etiqueta salva. Recarregue os dados para atualizar as tarefas.' : 'Etiqueta salva.');
      attempt.reset(); onClose();
    } catch (err) { if (!base) attempt.failed(err); }
  }
  return <><DraftDialog open onOpenChange={open => { if (!open) onClose(); }} busy={write.isPending} uncertain={attempt.uncertain}
    dirty={name !== (label?.name ?? '') || color !== (label?.color ?? 'BLUE')}
    title={base ? 'Editar etiqueta' : 'Criar etiqueta'} description="O nome e a cor são compartilhados por todas as tarefas que usam esta etiqueta."
    className="sm:max-w-project-dialog" footer={<>{base && <Button type="button" variant="ghost" size="icon" aria-label="Excluir etiqueta" disabled={write.isPending} onClick={() => setDeleting(true)}><Trash2 aria-hidden /></Button>}<Button form={formId} type="submit" disabled={write.isPending}><Save aria-hidden />Salvar etiqueta</Button></>}>
    <form id={formId} onSubmit={save} noValidate><fieldset className="min-w-0" disabled={write.isPending || attempt.uncertain}><FieldGroup>
      <Field data-invalid={!!error}><FieldLabel htmlFor={`${formId}-name`}>Nome da etiqueta</FieldLabel><Input id={`${formId}-name`} value={name} maxLength={50} required aria-invalid={!!error} aria-describedby={error ? `${formId}-error` : undefined} onChange={e => setName(e.target.value)} />{error && <p id={`${formId}-error`} role="alert" className="text-sm text-destructive">{error}</p>}</Field>
      <FieldSet className="gap-3"><FieldLegend>Cor da etiqueta</FieldLegend>
        <RadioGroup aria-label="Cor da etiqueta" value={color} onValueChange={value => setColor(value as TaskLabelColor)} className="grid grid-cols-2 gap-2">
          {TASK_LABEL_COLORS.map(value => <Label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3"><RadioGroupItem value={value} /><TaskLabelBadge label={{ name: LABEL_COLORS[value].name, color: value }} /></Label>)}
        </RadioGroup>
      </FieldSet>
      <div className="flex flex-col items-start gap-2"><span className="text-sm text-muted-foreground">Prévia</span><TaskLabelBadge label={{ name: name.trim() || 'Etiqueta', color }} /></div>
    </FieldGroup></fieldset></form>
    <div className="mt-4 flex flex-col gap-3"><WorkFeedback message={notice} /><WorkFeedback error={write.error} retry={base ? () => { void catalog.refetch().then(result => {
      const fresh = result.data?.find(row => row.id === base.id);
      if (fresh) { setBase(fresh); write.reset(); setNotice(`Etiqueta atual: ${fresh.name}. Seu rascunho foi mantido; revise antes de salvar.`); }
      else setNotice('Esta etiqueta não está mais disponível. Feche a edição e confira o catálogo.');
    }); } : undefined} />{attempt.uncertain && <WorkFeedback message="Confirmação indisponível. Reenvie pelo botão de salvar para evitar duplicação da etiqueta." />}</div>
  </DraftDialog>
  {base && <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Excluir etiqueta da conta?" objectName={base.name} confirmLabel="Excluir etiqueta" error={write.error}
    description="A etiqueta será removida de todas as suas tarefas. As tarefas serão preservadas, com os mesmos estados e datas."
    onConfirm={async () => { try { const result = await write.mutateAsync({ action: 'delete', label: base }); onDeleted(base.id); toast.success(result.refreshFailed ? 'Etiqueta excluída. Recarregue os dados.' : 'Etiqueta excluída.'); onClose(); return true; } catch { return false; } }} />}
  </>;
}
