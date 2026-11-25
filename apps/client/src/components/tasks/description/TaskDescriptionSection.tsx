import { Pencil } from 'lucide-react';
import { lazy, Suspense, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WorkTask } from '@/types/work';
import { emptyDescription, taskDescription } from './descriptionContent';
import { useDescriptionAutosave } from './useDescriptionAutosave';
import './task-description.css';

const TaskDescriptionEditor = lazy(() => import('./TaskDescriptionEditor').then(module => ({ default: module.TaskDescriptionEditor })));

export function TaskDescriptionSection({ task, loading }: { task: WorkTask; loading: boolean }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const edit = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const previewId = useId();
  const headingId = useId();
  const { draft, change, flush, chooseRemote, keepDraft } = useDescriptionAutosave(task);
  const original = useMemo(() => taskDescription(task), [task]);
  const content = draft ? draft.document ?? emptyDescription : original;
  const empty = draft ? !draft.document : !task.description && !task.descriptionDoc;
  const collapsed = !expanded && !editing;
  const text = <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{task.descriptionText ?? task.description}</p>;

  useLayoutEffect(() => {
    const container = preview.current;
    const inner = body.current;
    if (editing || !container || !inner) return;
    function measure() {
      const size = Number.parseFloat(getComputedStyle(container).getPropertyValue('--description-preview-height')) || 224;
      setOverflowing(inner.getBoundingClientRect().height > size);
    }
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [editing, empty]);

  useLayoutEffect(() => {
    if (body.current) body.current.inert = collapsed && overflowing;
  }, [collapsed, overflowing, empty]);

  function exit() {
    flush();
    setEditing(false);
    requestAnimationFrame(() => edit.current?.focus());
  }

  return <section className="min-w-0 space-y-2" aria-labelledby={headingId}>
    <div className="flex min-h-8 items-center justify-between gap-2">
      <h3 id={headingId} className="text-sm font-medium">Descrição</h3>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {draft?.status === 'saving' ? 'Salvando…' : draft?.status === 'dirty' ? 'Alterações pendentes' : ''}
        </span>
        {(editing || !empty) && <Button ref={edit} type="button" variant="ghost" size="sm" disabled={loading}
          onClick={editing ? exit : () => setEditing(true)}>
          {editing ? 'Sair da edição' : <><Pencil aria-hidden />Editar descrição</>}
        </Button>}
      </div>
    </div>
    {draft?.status === 'error' && <div role="alert" className="space-y-1 rounded-md border p-2 text-sm text-destructive">
      <p>{draft.message || 'Não foi possível salvar a descrição.'} O rascunho foi mantido.</p>
      <Button type="button" size="sm" variant="outline" onClick={() => flush(true)}>Tentar novamente</Button>
    </div>}
    {draft?.status === 'conflict' && <div role="alert" className="space-y-2 rounded-md border p-3 text-sm">
      <p>A descrição foi alterada em outro lugar. Seu rascunho está disponível abaixo.</p>
      <details className="space-y-1">
        <summary className="cursor-pointer">Ver versão salva</summary>
        <p className="whitespace-pre-wrap break-words text-muted-foreground">{draft.remote?.descriptionText ?? draft.remote?.description ?? 'Sem descrição.'}</p>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={chooseRemote}>Carregar versão salva</Button>
        <Button type="button" size="sm" onClick={keepDraft}>Manter meu rascunho</Button>
      </div>
    </div>}
    {editing
      ? <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Carregando editor…</p>}>
          <TaskDescriptionEditor taskId={task.id} document={content} editable autoFocus onChange={change} onExit={exit} />
        </Suspense>
      : empty
        ? <Button ref={edit} type="button" size="sm" variant="ghost" disabled={loading} className="text-muted-foreground"
          onClick={() => setEditing(true)}>Adicionar descrição…</Button>
        : <>
          <div id={previewId} ref={preview} className={cn('description-preview', collapsed && 'description-preview-clipped', collapsed && overflowing && 'description-preview-fade')}>
            <div ref={body}>
              {draft || task.descriptionDoc
                ? <Suspense fallback={text}><TaskDescriptionEditor taskId={task.id} document={content} /></Suspense>
                : text}
            </div>
          </div>
          {overflowing && <Button type="button" variant="ghost" size="sm" aria-controls={previewId} aria-expanded={expanded}
            onClick={() => setExpanded(value => !value)}>{expanded ? 'Mostrar menos' : 'Mostrar tudo'}</Button>}
        </>}
  </section>;
}
