import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { mcpService } from '@/services/mcpService';
import { emptyPermissions, mcpDate } from '@/lib/mcp';
import type { McpAuthorization, McpProject } from '@/types/mcp';
import { McpPermissionsEditor, McpPermissionSummary } from './McpPermissions';
import { McpFeedback } from './McpFeedback';

export function McpConsent({ flowId }: { flowId: string | null }) {
  const { userId } = useAuth();
  const flow = useQuery({ queryKey: ['mcp', userId, 'flow', flowId], enabled: Boolean(flowId), retry: false, staleTime: Infinity, refetchOnWindowFocus: false,
    queryFn: ({ signal }) => mcpService.authorization(flowId!, signal) });
  return <div className="flex min-w-0 flex-col gap-6">
    <PageHeader title="Autorizar conexão" description="Escolha o que este cliente pode acessar na sua conta." />
    {!flowId ? <><McpFeedback message="Solicitação inválida. Inicie uma nova autorização no cliente." /><Button className="min-h-11 max-md:min-h-11" variant="outline" asChild><Link to="/config">Voltar às configurações</Link></Button></>
      : flow.isPending ? <Skeleton className="h-48 w-full" aria-label="Carregando solicitação" />
      : flow.isError ? <><McpFeedback error={flow.error} retry={() => void flow.refetch()} /><Button className="min-h-11 max-md:min-h-11" variant="outline" asChild><Link to="/config">Voltar às configurações</Link></Button></>
      : <ConsentForm key={flow.data.id} flow={flow.data} />}
  </div>;
}

function ConsentForm({ flow }: { flow: McpAuthorization }) {
  const { userEmail } = useAuth();
  const [value, setValue] = useState(emptyPermissions), [projects, setProjects] = useState<McpProject[]>([]);
  const [name, setName] = useState(flow.clientName), [pending, setPending] = useState(false), [error, setError] = useState<unknown>();
  const [expired, setExpired] = useState(Date.now() >= Date.parse(flow.expiresAt));
  useEffect(() => { const timer = window.setTimeout(() => setExpired(true), Math.max(0, Date.parse(flow.expiresAt)-Date.now())); return () => clearTimeout(timer); }, [flow.expiresAt]);
  const decide = async (approve: boolean) => {
    if (pending || expired) return;
    setPending(true); setError(undefined);
    try {
      const result = await mcpService.decide(flow.id, { ...value, version: flow.version, name: name.trim(), approve });
      // Only the validated backend response supplies the callback, never browser query parameters.
      window.location.assign(result.redirectUrl);
    } catch (failure) { setError(failure); setPending(false); }
  };
  return <form onSubmit={e => { e.preventDefault(); void decide(true); }} className="flex min-w-0 flex-col gap-6">
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-5 text-sm">
      <p><strong>{flow.clientName}</strong> solicita acesso a <strong className="break-all">{userEmail}</strong>.</p>
      <p className="text-muted-foreground">O nome do cliente é um registro de configuração; não verifica a identidade do software. Solicitação válida até {mcpDate(flow.expiresAt)} (Recife).</p>
    </div>
    <fieldset disabled={pending || expired} className="flex min-w-0 flex-col gap-6">
      <label className="flex max-w-lg flex-col gap-2 text-sm font-medium">Nome da conexão<Input className="min-h-11 max-md:min-h-11" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
      <McpPermissionsEditor value={value} onChange={setValue} available={flow.requestedScopes} onProject={p => setProjects(current => [...current.filter(v => v.id !== p.id), p])} />
    </fieldset>
    <section aria-labelledby="consent-summary" className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <h2 id="consent-summary" className="text-base font-semibold">Resumo do acesso</h2>
      <McpPermissionSummary value={value} projects={projects} />
      <p className="text-sm text-muted-foreground">O conteúdo autorizado será entregue ao cliente de IA e poderá ser processado pelo provedor usado nele. Revogar interrompe acessos futuros; não apaga dados já recebidos. Sair do Oriens não revoga a conexão.</p>
      {value.scopes.some(s => s.endsWith(':delete')) && <p className="text-sm">As exclusões autorizadas dispensam nova confirmação no Oriens a cada chamada. O cliente pode exigir suas próprias confirmações.</p>}
    </section>
    <McpFeedback error={error} />
    {expired && <McpFeedback message="Esta solicitação expirou. Inicie uma nova autorização pelo cliente." />}
    <div className="flex flex-wrap gap-3">
      <Button className="min-h-11 max-md:min-h-11" type="submit" disabled={pending || expired || !name.trim()}>{pending ? 'Concluindo…' : 'Autorizar conexão'}</Button>
      <Button className="min-h-11 max-md:min-h-11" type="button" variant="outline" disabled={pending || expired} onClick={() => void decide(false)}>Cancelar</Button>
      {expired && <Button className="min-h-11 max-md:min-h-11" variant="outline" asChild><Link to="/config">Voltar às configurações</Link></Button>}
    </div>
  </form>;
}
