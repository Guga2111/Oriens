import { useId, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { mcpService } from '@/services/mcpService';
import { clientName, connectionStatus, mcpDate } from '@/lib/mcp';
import type { McpConnection } from '@/types/mcp';
import { McpFeedback } from './McpFeedback';
import { McpPermissionsEditor, McpPermissionSummary } from './McpPermissions';

const results: Record<string, string> = { SUCCESS: 'Sucesso', DENIED: 'Negada', FAILED: 'Falha', REVOKED: 'Revogada', REAUTHORIZATION_REQUIRED: 'Nova autorização necessária', REPLAY: 'Repetição reconhecida' };
const actions: Record<string, string> = { authorization: 'Conexão autorizada', authorization_declined: 'Autorização cancelada', permissions_reduced: 'Permissões reduzidas', renamed: 'Nome alterado', revocation: 'Acesso revogado', expansion_requested: 'Ampliação solicitada', connection_update: 'Edição da conexão', key_rotation: 'Rotação de proteção' };

function History({ id }: { id: string }) {
  const { userId } = useAuth();
  const resultId = useId();
  const [page, setPage] = useState(0), [result, setResult] = useState('');
  const events = useQuery({ queryKey: ['mcp', userId, 'events', id, page, result], retry: false,
    queryFn: ({ signal }) => mcpService.events(id, page, result, signal) });
  return <section aria-labelledby="mcp-history" className="flex min-w-0 flex-col gap-4">
    <h3 id="mcp-history" className="text-base font-semibold">Histórico de uso</h3>
    <p className="text-sm text-muted-foreground">Últimos 90 dias, horário de Recife. Somente metadados; o histórico não recupera conteúdo alterado.</p>
    <div className="flex flex-col gap-2 text-sm"><label htmlFor={resultId}>Resultado</label><select id={resultId} className="h-11 rounded-md border border-input bg-background px-3" value={result} onChange={e => { setResult(e.target.value); setPage(0); }}>
      <option value="">Todos os resultados</option>{Object.entries(results).map(([key,label]) => <option key={key} value={key}>{label}</option>)}
    </select></div>
    {events.isPending ? <Skeleton className="h-24 w-full" aria-label="Carregando histórico" /> : events.isError ? <McpFeedback error={events.error} retry={() => void events.refetch()} /> : <>
      {!events.data.items.length ? <p className="text-sm text-muted-foreground">Nenhuma operação neste filtro.</p> : <ul className="flex flex-col gap-4">
        {events.data.items.map(event => <li key={event.id} className="flex min-w-0 flex-col gap-1 text-sm">
          <p className="break-words font-medium">{actions[event.action] || event.action.replace(/^oriens_/, '').replace(/_/g, ' ')} · {results[event.result] || event.result}</p>
          <p className="text-muted-foreground">{mcpDate(event.occurred_at)}{event.duration_ms != null ? ` · ${event.duration_ms} ms` : ''}{event.result_count != null ? ` · ${event.result_count} resultados` : ''}</p>
          {!!event.field_names?.length && <p className="break-words text-muted-foreground">Campos: {event.field_names.join(', ')}</p>}
          <details className="min-w-0 text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3">Identificadores da operação</summary>
            <p className="break-all">Correlação: {event.request_id}</p><p className="break-all">Recursos: {JSON.stringify(event.resource_ids)}</p>
          </details>
        </li>)}
      </ul>}
      <p className="text-xs text-muted-foreground">{events.data.totalElements} eventos neste filtro · Página {page+1}</p>
      {(page > 0 || events.data.hasNext) && <div className="flex flex-wrap gap-2">
        <Button className="min-h-11 max-md:min-h-11" type="button" variant="outline" disabled={!page} onClick={() => setPage(page-1)}>Eventos anteriores</Button>
        <Button className="min-h-11 max-md:min-h-11" type="button" variant="outline" disabled={!events.data.hasNext} onClick={() => setPage(page+1)}>Próximos eventos</Button>
      </div>}
    </>}
  </section>;
}

export function McpConnectionDialog({ id, onClose, onExpand }: { id: string; onClose: () => void; onExpand: () => void }) {
  const { userId } = useAuth();
  const connection = useQuery({ queryKey: ['mcp', userId, 'connection', id], retry: false, staleTime: Infinity, refetchOnMount: 'always', refetchOnWindowFocus: false,
    queryFn: ({ signal }) => mcpService.connection(id, signal) });
  return <ResponsiveDialog open onOpenChange={open => { if (!open) onClose(); }} title="Gerenciar conexão" description="Revise o acesso e as operações deste cliente." className="sm:max-w-2xl">
    {connection.isPending || connection.isFetching ? <Skeleton className="h-48 w-full" aria-label="Carregando conexão" /> : connection.isError
      ? <McpFeedback error={connection.error} retry={() => void connection.refetch()} />
      : <ConnectionEditor key={connection.data.id+':'+connection.data.version} connection={connection.data} onReload={() => void connection.refetch()} onClose={onClose} onExpand={onExpand} />}
  </ResponsiveDialog>;
}

function ConnectionEditor({ connection: c, onReload, onClose, onExpand }: { connection: McpConnection; onReload: () => void; onClose: () => void; onExpand: () => void }) {
  const { userId } = useAuth(); const client = useQueryClient();
  const [name, setName] = useState(c.name), [value, setValue] = useState({ scopes: c.scopes, allowedProjectIds: c.allowedProjectIds, allowStandaloneTasks: c.allowStandaloneTasks });
  const [error, setError] = useState<unknown>(), [pending, setPending] = useState(false), [conflict, setConflict] = useState(false), [revokeOpen, setRevokeOpen] = useState(false);
  const active = connectionStatus(c) === 'Ativa';
  const refresh = async (updated: McpConnection) => {
    client.setQueryData(['mcp', userId, 'connection', c.id], updated);
    await client.invalidateQueries({ queryKey: ['mcp', userId, 'connections'] });
    await client.invalidateQueries({ queryKey: ['mcp', userId, 'events', c.id] });
  };
  const save = async () => {
    if (pending || conflict) return;
    setPending(true); setError(undefined);
    try { const updated = await mcpService.patch(c.id, { ...value, name: name.trim(), version: c.version }); await refresh(updated); toast.success('Permissões salvas.'); }
    catch (failure) { setError(failure); if (isAxiosError(failure) && failure.response?.status === 409) setConflict(true); }
    finally { setPending(false); }
  };
  return <div className="flex min-w-0 flex-col gap-6">
    <div className="flex flex-col gap-2 text-sm">
      <p className="break-words font-medium">{c.name} · {clientName(c.clientId)} · {connectionStatus(c)}</p>
      <p className="text-muted-foreground">Autorizada em {mcpDate(c.authorizedAt)}<br />Expira em {mcpDate(c.expiresAt)}<br />Último uso: {mcpDate(c.lastUsedAt)}{c.revokedAt && <><br />Revogada em {mcpDate(c.revokedAt)}</>}</p>
    </div>
    <section aria-labelledby="current-access" className="flex flex-col gap-3"><h3 id="current-access" className="text-base font-semibold">Acesso atual</h3>
      <McpPermissionSummary value={c} projects={c.allowedProjects} />
    </section>
    {active && <form onSubmit={e => { e.preventDefault(); void save(); }} className="flex min-w-0 flex-col gap-4">
      <h3 className="text-base font-semibold">Editar nome ou reduzir acesso</h3>
      <p className="text-sm text-muted-foreground">Reduções valem na próxima chamada. Para ampliar ações, projetos ou tarefas avulsas, autorize novamente no cliente: uma nova conexão será criada; esta conserva seu acesso até ser revogada.</p>
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
        <label className="flex flex-col gap-2 text-sm font-medium">Nome da conexão<Input className="min-h-11 max-md:min-h-11" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
        <McpPermissionsEditor value={value} onChange={setValue} available={[...c.scopes, ...(c.allowStandaloneTasks ? ['standalone'] : [])]} projects={c.allowedProjects} />
      </fieldset>
      <div className="flex flex-wrap gap-2"><Button className="min-h-11 max-md:min-h-11" type="submit" disabled={pending || conflict || !name.trim()}>{pending ? 'Salvando…' : 'Salvar permissões'}</Button>
        <Button className="min-h-11 max-md:min-h-11" type="button" variant="outline" disabled={pending} onClick={onExpand}>Ampliar acesso</Button>
      </div>
    </form>}
    {!active && <p className="text-sm text-muted-foreground">Esta autorização não permite novas chamadas. Inicie uma nova conexão pelo cliente para voltar a usar o MCP.</p>}
    <McpFeedback error={error} retry={conflict ? onReload : undefined} retryLabel="Descartar rascunho e recarregar" />
    <History id={c.id} />
    <div className="flex flex-wrap gap-2">
      {!c.revokedAt && <Button className="min-h-11 max-md:min-h-11" type="button" variant="outline" disabled={pending} onClick={() => setRevokeOpen(true)}>Revogar acesso</Button>}
      <Button className="min-h-11 max-md:min-h-11" type="button" variant="outline" onClick={onClose} disabled={pending}>Fechar</Button>
    </div>
    <ConfirmDialog open={revokeOpen} onOpenChange={setRevokeOpen} title="Revogar acesso?" objectName={c.name} confirmLabel="Revogar conexão"
      description={<>Revogar <strong>{c.name}</strong> interrompe acessos futuros. Operações concluídas e dados já recebidos pelo cliente permanecem. O histórico será preservado.</>}
      onConfirm={async () => {
        try { const updated = await mcpService.revoke(c.id, c.version); setRevokeOpen(false); await refresh(updated); toast.success('Acesso revogado.'); }
        catch (failure) { if (isAxiosError(failure) && failure.response?.status === 409) { setRevokeOpen(false); setError(failure); setConflict(true); } else throw failure; }
        return false;
      }} />
  </div>;
}
