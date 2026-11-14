import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { DraftDialog } from '@/components/common/DraftDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { WorkSelect } from '@/components/common/WorkSelect';
import { useProjectWrites } from '@/hooks/useWork';
import { useCreationAttempt } from '@/hooks/useCreationAttempt';
import { statusNames } from '@/lib/work-form';
import type { BoardResponse, ProjectWrite, WorkProject } from '@/types/work';
import type { TaskStatus } from '@/types/task';

const kinds = Object.entries(statusNames).map(([value, label]) => ({ value, label }));
export function BoardSettings({ project, board, onClose, onReload }: { project: WorkProject; board: BoardResponse; onClose: () => void; onReload: () => Promise<BoardResponse | undefined> }) {
  const write = useProjectWrites(); const attempt = useCreationAttempt();
  const [name, setName] = useState(''); const [kind, setKind] = useState<TaskStatus>('PENDING');
  const [editing, setEditing] = useState<{ id: number; version: number } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null); const [target, setTarget] = useState('none');
  const [pendingReplacement, setPendingReplacement] = useState('none'); const [completedReplacement, setCompletedReplacement] = useState('none');
  const [error, setError] = useState(''); const [saved, setSaved] = useState('');
  const [defaults, setDefaults] = useState({ pending: String(project.defaultPendingColumnId), completed: String(project.defaultCompletedColumnId), version: board.projectVersion });
  const removed = board.columns.find(c => c.id === removing);
  async function run(command: ProjectWrite) {
    setError(''); setSaved('');
    try { const result = await write.mutateAsync(command); setSaved(result.refreshFailed ? 'Configuração salva. Recarregue os dados antes de continuar.' : 'Configuração salva.'); return true; }
    catch { return false; }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaved(''); setError(''); if (!name.trim()) { setError('Informe o nome da coluna.'); return; }
    const body = { projectVersion: board.projectVersion, name: name.trim(), kind };
    if (editing) {
      if (await run({ action: 'column-patch', id: project.id, columnId: editing.id, body: { ...body, version: editing.version } })) { setEditing(null); setName(''); }
    } else {
      try {
        const command: ProjectWrite = { action: 'column-create', id: project.id, ...attempt.prepare(body) };
        // run preserves the error, while failed() retains the exact creation key on uncertainty.
        await write.mutateAsync(command); attempt.reset(); setName(''); setSaved('Coluna criada.');
      } catch (err) { attempt.failed(err); }
    }
  }
  function order(id: number, offset: number) {
    const ids = board.columns.map(c => c.id); const from = ids.indexOf(id); const to = from + offset;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    void run({ action: 'column-order', id: project.id, body: { projectVersion: board.projectVersion, columnIds: ids } });
  }
  return <DraftDialog dirty={!!name || defaults.pending !== String(project.defaultPendingColumnId) || defaults.completed !== String(project.defaultCompletedColumnId)} busy={write.isPending} uncertain={attempt.uncertain} open onOpenChange={v => { if (!v && !write.isPending) onClose(); }} title="Configurar quadro" description="Nome, significado e destinos padrão são configurações independentes." className="sm:max-w-[680px]">
    <div className="flex flex-col gap-5"><WorkFeedback error={write.error} message={error || saved} retry={() => { void onReload().then(fresh => {
        if (!fresh) return;
        const column = fresh.columns.find(c => c.id === editing?.id);
        if (column) setEditing({ id: column.id, version: column.version });
        setDefaults(d => ({ ...d, version: fresh.projectVersion })); write.reset(); setSaved('Dados recarregadas. Revise os nomes, significados e destinos do rascunho antes de salvar.');
      }); }} />
      <ul className="flex flex-col gap-3">{board.columns.map((c, i) => <li key={c.id} className="rounded-md border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-medium">{c.name}</p><p className="text-muted-foreground">{statusNames[c.kind]} · {c.totalCount} tarefas{project.defaultPendingColumnId === c.id ? ' · Padrão ao reabrir' : ''}{project.defaultCompletedColumnId === c.id ? ' · Padrão ao concluir' : ''}</p></div></div>
        <div className="mt-2 flex flex-wrap gap-1"><Button variant="ghost" size="sm" disabled={write.isPending} onClick={() => { setEditing({ id: c.id, version: c.version }); setName(c.name); setKind(c.kind); setRemoving(null); }}>Renomear / significado</Button><Button variant="ghost" size="sm" disabled={i === 0 || write.isPending} onClick={() => order(c.id, -1)} aria-label={`Mover coluna ${c.name} para a esquerda`}>←</Button><Button variant="ghost" size="sm" disabled={i === board.columns.length - 1 || write.isPending} onClick={() => order(c.id, 1)} aria-label={`Mover coluna ${c.name} para a direita`}>→</Button><Button variant="ghost" size="sm" disabled={write.isPending} onClick={() => { setRemoving(c.id); setTarget('none'); setPendingReplacement('none'); setCompletedReplacement('none'); }}>Excluir coluna</Button></div>
      </li>)}</ul>
      <form onSubmit={submit}><fieldset disabled={write.isPending || attempt.uncertain}><FieldGroup><Field><FieldLabel htmlFor="column-name">{editing ? 'Nome da coluna' : 'Nova coluna'}</FieldLabel><Input id="column-name" value={name} maxLength={60} onChange={e => setName(e.target.value)} /></Field>
        <Field><FieldLabel>Significado da coluna</FieldLabel><WorkSelect label="Significado da coluna" value={kind} options={kinds} disabled={!!editing && (board.columns.find(c => c.id === editing.id)?.totalCount ?? 0) > 0} onChange={v => setKind(v as TaskStatus)} />{editing && (board.columns.find(c => c.id === editing.id)?.totalCount ?? 0) > 0 && <p className="text-sm text-muted-foreground">Mova as tarefas antes de alterar o significado.</p>}</Field></FieldGroup></fieldset>
        <div className="mt-3 flex flex-wrap gap-2"><Button disabled={write.isPending} type="submit">{editing ? 'Salvar coluna' : 'Adicionar coluna'}</Button>{editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setName(''); }}>Cancelar edição</Button>}</div>
        {attempt.uncertain && <WorkFeedback message="Confirmação indisponível. Reenvie a mesma coluna para evitar duplicação." />}
      </form>
      <section aria-labelledby="board-defaults-title"><h3 id="board-defaults-title" className="mb-3 text-base font-medium">Destinos padrão</h3><FieldGroup>
        <Field><FieldLabel>Ao reabrir</FieldLabel><WorkSelect label="Padrão ao reabrir" value={defaults.pending} options={board.columns.filter(c => c.kind === 'PENDING').map(c => ({ value: String(c.id), label: c.name }))} onChange={v => setDefaults(d => ({ ...d, pending: v, version: board.projectVersion }))} /></Field>
        <Field><FieldLabel>Ao concluir</FieldLabel><WorkSelect label="Padrão ao concluir" value={defaults.completed} options={board.columns.filter(c => c.kind === 'CONCLUDED').map(c => ({ value: String(c.id), label: c.name }))} onChange={v => setDefaults(d => ({ ...d, completed: v, version: board.projectVersion }))} /></Field>
      </FieldGroup><Button className="mt-3" variant="outline" disabled={write.isPending} onClick={() => void run({ action: 'defaults', id: project.id, body: { projectVersion: defaults.version, pendingColumnId: Number(defaults.pending), completedColumnId: Number(defaults.completed) } })}>Salvar padrões</Button></section>
      {removed && <section aria-labelledby="remove-column-title" className="rounded-md border p-3"><h3 id="remove-column-title" className="text-base font-medium">Excluir {removed.name}?</h3><p className="my-3 text-sm">{removed.totalCount} tarefas serão movidas. Nenhuma tarefa será excluída. A última coluna A fazer ou Concluída não pode ser removida.</p>
        <FieldGroup><Field><FieldLabel>Destino das tarefas</FieldLabel><WorkSelect label="Destino das tarefas" value={target} options={[{ value: 'none', label: 'Escolha um destino' }, ...board.columns.filter(c => c.id !== removed.id).map(c => ({ value: String(c.id), label: `${c.name} · ${statusNames[c.kind]}` }))]} onChange={setTarget} /></Field>
          {project.defaultPendingColumnId === removed.id && <Field><FieldLabel>Novo padrão ao reabrir</FieldLabel><WorkSelect label="Novo padrão ao reabrir" value={pendingReplacement} onChange={setPendingReplacement} options={[{ value: 'none', label: 'Escolha o novo padrão' }, ...board.columns.filter(c => c.id !== removed.id && c.kind === 'PENDING').map(c => ({ value: String(c.id), label: c.name }))]} /></Field>}
          {project.defaultCompletedColumnId === removed.id && <Field><FieldLabel>Novo padrão ao concluir</FieldLabel><WorkSelect label="Novo padrão ao concluir" value={completedReplacement} onChange={setCompletedReplacement} options={[{ value: 'none', label: 'Escolha o novo padrão' }, ...board.columns.filter(c => c.id !== removed.id && c.kind === 'CONCLUDED').map(c => ({ value: String(c.id), label: c.name }))]} /></Field>}
        </FieldGroup>
        {target !== 'none' && <p className="my-3 text-sm">Estado resultante das tarefas: {statusNames[board.columns.find(c => c.id === Number(target))!.kind]}</p>}
        <div className="mt-3 flex flex-wrap gap-2"><Button variant="destructive" disabled={write.isPending || (removed.totalCount > 0 && target === 'none') || (project.defaultPendingColumnId === removed.id && pendingReplacement === 'none') || (project.defaultCompletedColumnId === removed.id && completedReplacement === 'none')}
          onClick={async () => { if (await run({ action: 'column-remove', id: project.id, columnId: removed.id, body: { projectVersion: board.projectVersion, ...(target !== 'none' ? { targetColumnId: Number(target) } : {}), ...(pendingReplacement !== 'none' ? { replacementPendingColumnId: Number(pendingReplacement) } : {}), ...(completedReplacement !== 'none' ? { replacementCompletedColumnId: Number(completedReplacement) } : {}) } })) { toast.success('Coluna excluída; tarefas preservadas.'); setRemoving(null); } }}>Confirmar exclusão da coluna</Button><Button variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button></div>
      </section>}
    </div>
  </DraftDialog>;
}
