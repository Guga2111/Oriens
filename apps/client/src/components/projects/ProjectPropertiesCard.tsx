import { useId, useRef, useState, type CSSProperties } from 'react';
import { Archive, CircleDot, Kanban, Palette, Pin, PinOff } from 'lucide-react';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProjectFlags, useProjectWrites, useWorkProject } from '@/hooks/useWork';
import type { WorkProject } from '@/types/work';
import { PropertyButton, PropertySelect } from './PropertyControl';

const DEFAULT_COLOR = '#808080';
const statusOptions = [
  { value: 'active', label: 'Ativo', icon: <CircleDot aria-hidden /> },
  { value: 'archived', label: 'Arquivado', icon: <Archive aria-hidden /> },
] as const;
const pinnedOptions = [
  { value: 'no', label: 'Não', icon: <PinOff aria-hidden /> },
  { value: 'yes', label: 'Sim', icon: <Pin aria-hidden className="fill-current" /> },
] as const;

export function ProjectPropertiesCard({ project }: { project: WorkProject }) {
  const headingId = useId();
  const flags = useProjectFlags();
  const write = useProjectWrites();
  const current = useWorkProject(project.id);
  const busy = flags.isPending || write.isPending;

  function setFlag(field: 'archive' | 'favorite', value: boolean) {
    write.reset();
    flags.mutate({ project, field, value });
  }

  return (
    <section aria-labelledby={headingId}>
      <Card className="space-y-4 p-4 shadow-none md:p-5">
        <h2 id={headingId} className="text-base font-semibold">Propriedades</h2>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 text-sm">
          <dt className="flex items-center gap-2 text-muted-foreground"><CircleDot aria-hidden className="size-4 shrink-0" />Situação</dt>
          <dd className="flex justify-end">
            <PropertySelect label="Situação" value={project.archived ? 'archived' : 'active'} options={statusOptions}
              disabled={busy} onChange={value => setFlag('archive', value === 'archived')} />
          </dd>
          <dt className="flex items-center gap-2 text-muted-foreground"><Kanban aria-hidden className="size-4 shrink-0" />Tipo</dt>
          <dd className="text-right text-xs font-medium">{project.mode === 'DEVELOPMENT' ? 'Desenvolvimento' : 'Simples'}</dd>
          <dt className="flex items-center gap-2 text-muted-foreground"><Palette aria-hidden className="size-4 shrink-0" />Cor</dt>
          <dd className="flex justify-end">
            <ProjectColorPicker project={project} busy={busy} pending={write.isPending} error={write.error} onOpen={() => {
              flags.reset();
              write.reset();
            }} onReload={async () => {
              const result = await current.refetch();
              if (!result.isSuccess) return;
              write.reset();
              return result.data.version;
            }} onSave={async (color, version) => {
              await write.mutateAsync({ action: 'metadata', id: project.id, body: { color, version } });
            }} />
          </dd>
          <dt className="flex items-center gap-2 text-muted-foreground"><Pin aria-hidden className="size-4 shrink-0" />Fixado</dt>
          <dd className="flex justify-end">
            <PropertySelect label="Fixado" value={project.favorite ? 'yes' : 'no'} options={pinnedOptions}
              disabled={busy} onChange={value => setFlag('favorite', value === 'yes')} />
          </dd>
        </dl>
        <WorkFeedback error={flags.error} retry={() => void current.refetch().then(result => {
          if (result.isSuccess) flags.reset();
        })} />
        {(flags.data?.refreshFailed || write.data?.refreshFailed) &&
          <WorkFeedback message="Projeto salvo. Recarregue a página para atualizar as listas." />}
      </Card>
    </section>
  );
}

function ProjectColorPicker({ project, busy, pending, error, onOpen, onReload, onSave }: {
  project: WorkProject; busy: boolean; pending: boolean; error: unknown; onOpen: () => void;
  onReload: () => Promise<number | undefined>; onSave: (color: string | null, version: number) => Promise<void>;
}) {
  const inputId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<{ color: string | null; version: number } | null>(null);
  const color = project.color;
  const colorLabel = color?.toUpperCase() ?? 'Sem cor';
  return <Popover open={draft !== null} onOpenChange={open => {
    if (pending) return;
    if (open) onOpen();
    setDraft(open ? { color: color ?? DEFAULT_COLOR, version: project.version } : null);
  }}>
    <PopoverTrigger asChild>
      <PropertyButton aria-label={`Cor: ${colorLabel}`} disabled={busy}>
        {color ? <span aria-hidden className="size-3 shrink-0 rounded-full border bg-[var(--project-color)]"
          style={{ '--project-color': color } as CSSProperties} /> : <Palette aria-hidden />}
        {colorLabel}
      </PropertyButton>
    </PopoverTrigger>
    {draft && <PopoverContent align="end" aria-label="Editar cor do projeto" onOpenAutoFocus={event => {
      event.preventDefault();
      formRef.current?.focus();
    }}
      className="w-64 max-w-[var(--radix-popover-content-available-width)] p-3">
      <form ref={formRef} tabIndex={-1} className="flex flex-col gap-3 outline-none" onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        try {
          await onSave(draft.color, draft.version);
          setDraft(null);
        } catch { /* WorkFeedback shows the mutation error and the draft stays open. */ }
      }}>
        <Label htmlFor={inputId} className="font-semibold">Cor do projeto</Label>
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
          <Input id={inputId} type="color" value={draft.color ?? DEFAULT_COLOR} disabled={busy}
            className="h-11 w-12 shrink-0 cursor-pointer p-1 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md"
            onChange={event => setDraft({ ...draft, color: event.target.value })} />
          <span className="break-words text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {draft.color?.toUpperCase() ?? 'Sem cor'}
          </span>
        </div>
        <WorkFeedback error={error} retry={() => void onReload().then(version => {
          if (version !== undefined) setDraft(previous => previous && { ...previous, version });
        })} />
        <div className="flex flex-wrap items-center justify-end gap-1.5 border-t pt-3">
          <Button type="button" variant="ghost" size="sm" disabled={busy || draft.color === null}
            onClick={() => setDraft({ ...draft, color: null })}>Remover cor</Button>
          <Button type="submit" size="sm" disabled={busy || draft.color === color}>{pending ? 'Salvando…' : 'Salvar cor'}</Button>
        </div>
      </form>
    </PopoverContent>}
  </Popover>;
}
