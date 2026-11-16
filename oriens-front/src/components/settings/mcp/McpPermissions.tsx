import { useId, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkProjects } from '@/hooks/useWork';
import { dependencies, permissionGroups, scopeLabel, toggleScope } from '@/lib/mcp';
import type { McpPermissions as Permissions, McpProject } from '@/types/mcp';
import { McpFeedback } from './McpFeedback';

function Choice({ label, note, checked, disabled, onChange }: { label: string; note?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return <div className="flex min-h-11 items-start gap-3">
    <Checkbox id={id} aria-label={label} checked={checked} disabled={disabled} onCheckedChange={v => onChange(v === true)} className="mt-3" aria-describedby={note ? id+'-note' : undefined} />
    <label htmlFor={id} className="min-h-11 min-w-0 flex-1 cursor-pointer py-2 text-sm leading-6">
      {label}{note && <span id={id+'-note'} className="block text-xs leading-5 text-muted-foreground">{note}</span>}
    </label>
  </div>;
}

function ProjectPicker({ value, onChange, onProject }: { value: Permissions; onChange: (v: Permissions) => void; onProject?: (p: McpProject) => void }) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(0);
  const projects = useWorkProjects({ page, size: 10, includeArchived: true, search, sortBy: 'title', direction: 'ASC' });
  return <div className="flex flex-col gap-3">
    <label className="flex flex-col gap-2 text-sm">Buscar projetos<Input className="min-h-11 max-md:min-h-11" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Nome do projeto" /></label>
    {projects.isPending ? <Skeleton className="h-20 w-full" aria-label="Carregando projetos" /> : projects.isError
      ? <McpFeedback error={projects.error} retry={() => void projects.refetch()} />
      : <>
        {!projects.data.content.length && <p className="text-sm text-muted-foreground">Nenhum projeto encontrado.</p>}
        {projects.data.content.map(p => <Choice key={p.id} label={p.title + (p.archived ? ' · Arquivado' : '')} checked={value.allowedProjectIds.includes(p.id)} onChange={checked => { onProject?.(p); onChange({ ...value,
          allowedProjectIds: checked ? [...value.allowedProjectIds, p.id] : value.allowedProjectIds.filter(id => id !== p.id),
        }); }} />)}
        {(page > 0 || !projects.data.last) && <div className="flex flex-wrap items-center gap-2">
          <Button className="min-h-11 max-md:min-h-11" type="button" variant="outline" disabled={!page} onClick={() => setPage(page-1)}>Projetos anteriores</Button>
          <Button className="min-h-11 max-md:min-h-11" type="button" variant="outline" disabled={projects.data.last} onClick={() => setPage(page+1)}>Próximos projetos</Button>
        </div>}
      </>}
    <p className="text-xs text-muted-foreground">Somente os projetos marcados serão autorizados. Projetos novos não entram automaticamente.</p>
  </div>;
}

export function McpPermissionsEditor({ value, onChange, available, projects, onProject }: {
  value: Permissions; onChange: (v: Permissions) => void; available: readonly string[]; projects?: McpProject[]; onProject?: (p: McpProject) => void;
}) {
  return <div className="flex flex-col gap-6">
    <p className="text-sm text-muted-foreground">O contexto mínimo identifica a conexão, sem liberar conteúdo. Ações de escrita incluem a leitura necessária, quando solicitada pelo cliente.</p>
    {permissionGroups.map(group => <fieldset key={group.title} className="min-w-0">
      <legend className="mb-1 text-base font-semibold">{group.title}</legend>
      <p className="mb-2 text-sm text-muted-foreground">{group.note}</p>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {group.actions.map(([scope, label]) => {
          const allowed = [scope, ...dependencies(scope)].every(s => available.includes(s));
          return <Choice key={scope} label={label} note={!allowed ? 'Requer nova autorização no cliente.' : undefined}
            disabled={!allowed} checked={value.scopes.includes(scope)} onChange={checked => onChange(toggleScope(value, scope, checked, available))} />;
        })}
      </div>
      {group.title === 'Projetos' && <>
        {value.scopes.includes('projects:create') && <p className="text-sm text-muted-foreground">Criar um projeto não libera acesso posterior a ele. O novo projeto exige outra autorização.</p>}
        {(value.scopes.includes('projects:delete') || value.scopes.includes('objectives:delete')) && <p className="text-sm text-muted-foreground">Excluir um projeto preserva suas tarefas como avulsas. Excluir um objetivo preserva as tarefas e remove seu vínculo.</p>}
        {value.scopes.includes('projects:read') && <fieldset className="mt-4 min-w-0 rounded-md bg-muted/50 p-4">
          <legend className="text-sm font-medium">Projetos autorizados</legend>
          {projects ? <>
            {!projects.length && <p className="text-sm text-muted-foreground">Nenhum projeto autorizado nesta conexão.</p>}
            {projects.map(p => <Choice key={p.id} label={p.title + (p.archived ? ' · Arquivado' : '')} checked={value.allowedProjectIds.includes(p.id)}
              onChange={checked => onChange({ ...value, allowedProjectIds: checked ? [...value.allowedProjectIds, p.id] : value.allowedProjectIds.filter(id => id !== p.id) })} />)}
          </> : <ProjectPicker value={value} onChange={onChange} onProject={onProject} />}
        </fieldset>}
      </>}
      {group.title === 'Tarefas' && <Choice label="Incluir tarefas avulsas" note="Tarefas sem projeto. Transferências exigem acesso à origem e ao destino."
        disabled={!value.scopes.includes('tasks:read') || (projects !== undefined && !available.includes('standalone'))}
        checked={value.allowStandaloneTasks} onChange={checked => onChange({ ...value, allowStandaloneTasks: checked })} />}
    </fieldset>)}
    <fieldset className="min-w-0"><legend className="text-base font-semibold">Renovação</legend>
      <Choice label="Manter a conexão renovável" note={available.includes('offline_access') ? 'Por até 30 dias após a autorização, sem ampliar o acesso. Pode ser revogada a qualquer momento.' : 'Não solicitada. Requer nova autorização no cliente.'}
        checked={value.scopes.includes('offline_access')} disabled={!available.includes('offline_access')}
        onChange={checked => onChange(toggleScope(value, 'offline_access', checked, available))} />
    </fieldset>
  </div>;
}

export function McpPermissionSummary({ value, projects }: { value: Permissions; projects: McpProject[] }) {
  const selected = projects.filter(p => value.allowedProjectIds.includes(p.id));
  return <div className="flex flex-col gap-3 text-sm">
    <p><strong>Projetos:</strong> {selected.length ? selected.map(p => p.title + (p.archived ? ' (arquivado)' : '')).join(', ') : 'Nenhum.'}</p>
    <p><strong>Tarefas avulsas:</strong> {value.allowStandaloneTasks ? 'Autorizadas.' : 'Sem acesso.'}</p>
    {permissionGroups.map(g => <p key={g.title}><strong>Ações em {g.title.toLowerCase()}:</strong> {value.scopes.filter(s => g.actions.some(a => a[0] === s)).map(scopeLabel).join('; ') || 'Sem acesso.'}</p>)}
    <p><strong>Renovação:</strong> {value.scopes.includes('offline_access') ? 'Até 30 dias após autorizar.' : 'Sem renovação automática.'}</p>
  </div>;
}
