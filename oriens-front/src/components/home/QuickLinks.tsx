import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Link2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { WorkFeedback } from '@/components/common/WorkFeedback';
import { QueryContent, AnalysisEmpty } from '@/components/statistics/AnalysisPrimitives';
import { useHomeLinks, useHomeLinkWrites } from '@/hooks/useHome';
import { useCreationAttempt } from '@/hooks/useCreationAttempt';
import { validQuickLink } from '@/lib/home';
import type { QuickLink } from '@/types/home';

function LinkEditor({ link, onClose }: { link?: QuickLink; onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState(link?.name ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [errors, setErrors] = useState<{ name?: string; url?: string }>({});
  const write = useHomeLinkWrites();
  const attempt = useCreationAttempt();
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const next = { name: !name.trim() || name.trim().length > 80 ? 'Informe um nome com até 80 caracteres.' : undefined,
      url: !validQuickLink(url) ? 'Informe uma página do Oriens ou um endereço HTTPS válido.' : undefined };
    setErrors(next);
    if (next.name || next.url) return;
    try {
      const body = { name: name.trim(), url: url.trim() };
      const prepared = link ? { body, key: undefined } : attempt.prepare(body);
      await write.mutateAsync({ kind: 'save', link, ...prepared });
      onClose();
    } catch (error) { if (!link) attempt.failed(error); }
  }
  return <ResponsiveDialog open onOpenChange={open => { if (!open && !write.isPending) onClose(); }}
    title={link ? 'Editar link' : 'Adicionar link'} description="Seus atalhos ficam salvos na sua conta."
    footer={<><Button variant="outline" disabled={write.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" form={id} disabled={write.isPending}>{write.isPending ? 'Salvando…' : attempt.uncertain ? 'Repetir tentativa' : 'Salvar link'}</Button></>}>
    <form id={id} onSubmit={save} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={!!errors.name}><FieldLabel htmlFor={`${id}-name`}>Nome</FieldLabel>
          <Input id={`${id}-name`} value={name} maxLength={80} autoFocus disabled={write.isPending || attempt.uncertain} onChange={e => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-error` : undefined} />
          {errors.name && <FieldError id={`${id}-name-error`}>{errors.name}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.url}><FieldLabel htmlFor={`${id}-url`}>Endereço</FieldLabel>
          <Input id={`${id}-url`} value={url} maxLength={2048} placeholder="https://… ou /projects" disabled={write.isPending || attempt.uncertain} onChange={e => setUrl(e.target.value)} aria-invalid={!!errors.url} aria-describedby={`${id}-url-hint${errors.url ? ` ${id}-url-error` : ''}`} />
          <FieldDescription id={`${id}-url-hint`}>Use uma rota do Oriens ou um link HTTPS externo.</FieldDescription>
          {errors.url && <FieldError id={`${id}-url-error`}>{errors.url}</FieldError>}
        </Field>
      </FieldGroup>
      <WorkFeedback error={write.error} />
    </form>
  </ResponsiveDialog>;
}

export function QuickLinks() {
  const query = useHomeLinks();
  const write = useHomeLinkWrites();
  const [editor, setEditor] = useState<QuickLink | 'new' | null>(null);
  const [removing, setRemoving] = useState<QuickLink | null>(null);
  return <section aria-labelledby="home-links-title" className="flex min-w-0 flex-col gap-4">
    <div className="flex items-center justify-between gap-3"><h2 id="home-links-title" className="text-sm font-medium">Links rápidos</h2>
      <Button variant="outline" size="sm" disabled={!query.data || query.data.length >= 20} onClick={() => setEditor('new')}><Plus aria-hidden />Adicionar link</Button>
    </div>
    <QueryContent query={query} label="links rápidos">{links => links.length === 0
      ? <AnalysisEmpty title="Seus atalhos, em um só lugar" description="Adicione páginas do Oriens ou sites que você usa no trabalho." action={<Button variant="outline" size="sm" onClick={() => setEditor('new')}><Plus aria-hidden />Adicionar primeiro link</Button>} />
      : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{links.map(link => <div key={link.id} className="flex min-w-0 items-center gap-1 rounded-lg border border-border px-3 py-2">
        <Button asChild variant="ghost" className="h-auto min-w-0 flex-1 justify-start gap-3 px-0 py-1 text-left font-normal">
          {link.url.startsWith('/') ? <Link to={link.url}><Link2 aria-hidden className="shrink-0 text-muted-foreground" /><span className="truncate">{link.name}</span></Link>
            : <a href={link.url} target="_blank" rel="noopener noreferrer"><ArrowUpRight aria-hidden className="shrink-0 text-muted-foreground" /><span className="truncate">{link.name}</span><span className="sr-only"> (abre em outra aba)</span></a>}
        </Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Opções de ${link.name}`}><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setEditor(link)}><Pencil aria-hidden />Editar</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRemoving(link)}><Trash2 aria-hidden />Remover</DropdownMenuItem>
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu>
      </div>)}</div>}
    </QueryContent>
    {query.data?.length === 20 && <p className="text-xs text-muted-foreground">Limite de 20 links atingido. Remova um para adicionar outro.</p>}
    {editor && <LinkEditor link={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />}
    {removing && <ConfirmDialog open onOpenChange={open => { if (!open) setRemoving(null); }} title="Remover link rápido?" objectName={removing.name} confirmLabel="Remover link"
      onConfirm={async () => { await write.mutateAsync({ kind: 'remove', link: removing }); }} />}
  </section>;
}
