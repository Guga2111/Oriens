import { lazy, Suspense, useId, useRef, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { descriptionFromText, emptyDescription } from '@/components/tasks/description/descriptionContent';
import { useProjectWrites } from '@/hooks/useWork';
import { isWorkVersionConflict } from '@/lib/work-form';
import type { TaskDescriptionDocument, WorkProject } from '@/types/work';

const DescriptionEditor = lazy(() =>
  import('@/components/tasks/description/TaskDescriptionEditor').then(module => ({ default: module.TaskDescriptionEditor })));

interface Draft {
  version: number;
  document: TaskDescriptionDocument | null;
  initialDocument: TaskDescriptionDocument;
}

export function ProjectDescriptionSection({ project, onReload }: { project: WorkProject; onReload: () => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const write = useProjectWrites();
  const hasDescription = Boolean(project.descriptionDoc ?? project.description?.trim());
  const DescriptionIcon = hasDescription ? Pencil : Plus;

  function begin() {
    write.reset();
    const document = project.descriptionDoc ?? descriptionFromText(project.description);
    setDraft({ version: project.version, document, initialDocument: document });
  }

  function close() {
    setDraft(null);
    write.reset();
    requestAnimationFrame(() => trigger.current?.focus());
  }

  async function save() {
    if (!draft || draft.version !== project.version || write.isPending) return;
    try {
      const saved = await write.mutateAsync({
        action: 'description',
        id: project.id,
        body: { version: draft.version, descriptionDoc: draft.document },
      });
      toast.success(saved.refreshFailed ? 'Descrição salva. Recarregue para atualizar os dados.' : 'Descrição salva.');
      close();
    } catch (error) {
      if (isWorkVersionConflict(error)) onReload();
    }
  }

  const loading = <p role="status" className="text-sm text-muted-foreground">Carregando descrição…</p>;
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-base font-semibold">Descrição</h2>
        {!draft && <Button ref={trigger} type="button" variant="outline" size="sm" onClick={begin}>
          <DescriptionIcon aria-hidden />
          {hasDescription ? 'Editar descrição' : 'Adicionar descrição'}
        </Button>}
      </div>
      {draft ? (
        <div className="flex min-w-0 flex-col gap-3" aria-busy={write.isPending}>
          <div className="min-w-0 rounded-lg border p-3">
            <Suspense fallback={loading}>
              <DescriptionEditor className="!text-base" document={draft.document ?? emptyDescription} editable={!write.isPending} autoFocus
                onChange={document => setDraft(current => current && { ...current, document })} />
            </Suspense>
          </div>
          {!write.isPending && draft.version !== project.version ? (
            <div role="alert" className="flex flex-col items-start gap-2 rounded-md border p-3 text-sm">
              <p>O projeto foi alterado. Escolha qual descrição quer manter antes de salvar.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={begin}>Carregar versão salva</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  setDraft({ ...draft, version: project.version });
                  write.reset();
                }}>Manter meu rascunho</Button>
              </div>
            </div>
          ) : <WorkFeedback error={write.error} retry={isWorkVersionConflict(write.error) ? onReload : undefined} />}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" disabled={write.isPending} onClick={close}>Cancelar</Button>
            <Button type="button" disabled={write.isPending || draft.version !== project.version || draft.document === draft.initialDocument}
              onClick={() => void save()}>
              {write.isPending ? 'Salvando…' : 'Salvar descrição'}
            </Button>
          </div>
        </div>
      ) : <ProjectDescriptionView project={project} hasDescription={hasDescription} />}
    </section>
  );
}

function ProjectDescriptionView({ project, hasDescription }: { project: WorkProject; hasDescription: boolean }) {
  if (!hasDescription) return (
    <Empty className="items-start border p-4 text-left md:p-4">
      <EmptyDescription>Inclua o propósito, o escopo ou os próximos passos do projeto.</EmptyDescription>
    </Empty>
  );
  const text = <p className="whitespace-pre-wrap break-words leading-relaxed">{project.description}</p>;
  return <div className="max-w-prose">
    {project.descriptionDoc ? (
      <Suspense fallback={text}><DescriptionEditor className="!text-base" document={project.descriptionDoc} /></Suspense>
    ) : text}
  </div>;
}
