import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { mcpService } from '@/services/mcpService';
import { clientName, connectionStatus, mcpDate, mcpUnavailableMessage } from '@/lib/mcp';
import { McpFeedback } from './McpFeedback';
import { McpSetupDialog } from './McpSetupDialog';
import { McpConnectionDialog } from './McpConnectionDialog';

export function McpConnections() {
  const { userId } = useAuth();
  const [page, setPage] = useState(0), [setupOpen, setSetupOpen] = useState(false), [selected, setSelected] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null), connect = useRef<HTMLButtonElement>(null);
  const connections = useQuery({ queryKey: ['mcp', userId, 'connections', page], retry: false,
    queryFn: ({ signal }) => mcpService.connections(page, signal) });
  const unavailable = isAxiosError(connections.error) && connections.error.response?.status === 404;
  const restoreFocus = () => requestAnimationFrame(() => { (trigger.current?.isConnected ? trigger.current : connect.current)?.focus(); });
  return <div className="flex min-w-0 flex-col gap-4 p-5">
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0"><h3 className="text-sm font-medium">Clientes de IA via MCP</h3><p className="text-sm text-muted-foreground">Projetos, tarefas e finanças, com acesso escolhido por você.</p></div>
      <Button ref={connect} className="min-h-11 max-md:min-h-11" disabled={unavailable} onClick={e => { trigger.current=e.currentTarget; setSetupOpen(true); }}>Conectar via MCP</Button>
    </div>
    {connections.isPending ? <Skeleton className="h-20 w-full" aria-label="Carregando conexões" /> : connections.isError
      ? <McpFeedback error={connections.error} message={unavailable ? mcpUnavailableMessage : undefined} retry={() => void connections.refetch()} />
      : <>
        {!connections.data.items.length && <p className="text-sm text-muted-foreground">Nenhuma conexão autorizada. Configure seu cliente e escolha o acesso no consentimento.</p>}
        <ul className="flex flex-col gap-4">
          {connections.data.items.map(c => <li key={c.id} className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 text-sm"><p className="break-words font-medium">{c.name} · {clientName(c.clientId)} · {connectionStatus(c)}</p>
              <p className="text-muted-foreground">Autorizada em {mcpDate(c.authorizedAt)} · Último uso: {mcpDate(c.lastUsedAt)}</p>
              <p className="break-words text-muted-foreground">Projetos: {c.allowedProjects.map(p => p.title + (p.archived ? ' (arquivado)' : '')).join(', ') || 'Nenhum'} · Avulsas: {c.allowStandaloneTasks ? 'Sim' : 'Não'} · Finanças: {c.scopes.includes('finance:read') ? 'Conta inteira' : 'Sem acesso'}</p>
            </div>
            <Button variant="outline" className="min-h-11 max-md:min-h-11 shrink-0" aria-label={`Gerenciar ${c.name}`} onClick={e => { trigger.current=e.currentTarget; setSelected(c.id); }}>Gerenciar</Button>
          </li>)}
        </ul>
        {(page > 0 || connections.data.hasNext) && <div className="flex flex-wrap items-center gap-2">
          <Button className="min-h-11 max-md:min-h-11" variant="outline" disabled={!page} onClick={() => setPage(page-1)}>Conexões anteriores</Button><span className="text-xs text-muted-foreground">Página {page+1} · {connections.data.totalElements} conexões</span>
          <Button className="min-h-11 max-md:min-h-11" variant="outline" disabled={!connections.data.hasNext} onClick={() => setPage(page+1)}>Próximas conexões</Button>
        </div>}
        <p className="text-xs text-muted-foreground">Ativa significa autorização vigente. A conexão não precisa estar em uma sessão de rede aberta. Sair do Oriens não revoga este acesso.</p>
      </>}
    <McpSetupDialog open={setupOpen} onOpenChange={open => { setSetupOpen(open); if (!open) restoreFocus(); }} />
    {selected && <McpConnectionDialog id={selected} onClose={() => { setSelected(null); restoreFocus(); }} onExpand={() => { setSelected(null); trigger.current=connect.current; setSetupOpen(true); }} />}
  </div>;
}
