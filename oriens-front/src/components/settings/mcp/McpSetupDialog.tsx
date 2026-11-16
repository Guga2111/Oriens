import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { mcpService } from '@/services/mcpService';
import { mcpSetupText } from '@/lib/mcp-setup';
import { mcpSetupError } from '@/lib/mcp';
import type { McpClient } from '@/types/mcp';
import { McpFeedback } from './McpFeedback';

export function McpSetupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { userId } = useAuth();
  const clientId = useId();
  const [client, setClient] = useState<McpClient>('codex'), [copied, setCopied] = useState(false), [copyError, setCopyError] = useState(false);
  const setup = useQuery({ queryKey: ['mcp', userId, 'setup', client], enabled: open, retry: false,
    queryFn: ({ signal }) => mcpService.setup(client, signal) });
  let text = '', configurationError = '';
  if (setup.data) { try { text = mcpSetupText(setup.data); } catch (error) { configurationError = (error as Error).message; } }
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setCopyError(false); } catch { setCopyError(true); } };
  return <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Conectar via MCP" description="Escolha o cliente que terá acesso ao Oriens." className="sm:max-w-2xl"
    footer={<Button className="min-h-11 max-md:min-h-11" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>}>
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 text-sm font-medium"><label htmlFor={clientId}>Cliente</label>
        <select id={clientId} className="h-11 w-full rounded-md border border-input bg-background px-3" value={client} onChange={e => { setClient(e.target.value as McpClient); setCopied(false); setCopyError(false); }}>
          <option value="codex">Codex</option><option value="claude-code">Claude Code</option><option value="other">Outro cliente</option>
        </select>
      </div>
      <p className="text-sm text-muted-foreground">Copiar a configuração não autoriza acesso nem instala programas. Você escolherá os dados e as ações no consentimento do Oriens.</p>
      {setup.isPending ? <Skeleton className="h-40 w-full" aria-label="Carregando configuração" /> : setup.isError
        ? <McpFeedback error={setup.error} message={mcpSetupError(setup.error)} retry={() => void setup.refetch()} />
        : configurationError ? <McpFeedback message={configurationError} /> : <>
          <label className="flex flex-col gap-2 text-sm font-medium">URL do servidor<input className="h-11 w-full rounded-md border border-input bg-background px-3 font-normal" readOnly value={setup.data.resource} onFocus={e => e.currentTarget.select()} /></label>
          <p className="text-sm">{client === 'codex' ? 'Adicione este bloco ao arquivo ~/.codex/config.toml. Depois execute codex mcp login oriens.' : client === 'claude-code' ? 'Adicione este servidor ao arquivo .mcp.json do projeto. Depois execute claude mcp login oriens na pasta do projeto.' : 'O cliente precisa aceitar OAuth com um registro público previamente aprovado pelo operador.'}</p>
          <pre tabIndex={0} aria-label="Configuração do cliente" className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs leading-5"><code>{text}</code></pre>
          <Button className="min-h-11 max-md:min-h-11" onClick={() => void copy()}>Copiar configuração</Button>
          {copied && <p role="status" className="text-sm">Configuração copiada. Inicie a autorização no cliente.</p>}
          {copyError && <p role="alert" className="text-sm">Não foi possível copiar. Selecione e copie o texto acima.</p>}
          <p className="text-xs text-muted-foreground">{client === 'codex' ? 'Validado com Codex CLI 0.167.1.' : client === 'claude-code' ? 'Validado com Claude Code 2.1.325.' : 'A compatibilidade depende do registro e do cliente.'} Nenhuma senha ou chave de provedor é necessária. O histórico guarda metadados por {setup.data.auditRetentionDays} dias.</p>
        </>}
    </div>
  </ResponsiveDialog>;
}
