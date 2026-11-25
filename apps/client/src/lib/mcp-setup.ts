import type { McpSetup } from '../types/mcp';

/** Configuration contains public metadata only. JSON strings are also valid TOML basic strings. */
export function mcpSetupText(setup: McpSetup): string {
  if (setup.client === 'other') return `URL MCP: ${setup.resource}\nEmissor OAuth: ${setup.issuer}\nTransporte: Streamable HTTP\nFluxo: Authorization Code com PKCE (S256)\n\nSolicite ao operador um registro público próprio e informe a URL exata de retorno do seu cliente. Este ambiente não oferece registro automático. Não reutilize o identificador de outro aplicativo.`;
  if (!setup.clientId || !setup.redirectUris.length) throw new Error('Registro do cliente indisponível.');
  if (setup.client === 'codex') {
    const callback = new URL(setup.redirectUris[0]);
    return `[mcp_servers.oriens]\nurl = ${JSON.stringify(setup.resource)}\nscopes = ${JSON.stringify(setup.scopes)}\n\n[mcp_servers.oriens.oauth]\nclient_id = ${JSON.stringify(setup.clientId)}\ncallback_url = ${JSON.stringify(callback.href)}${callback.port ? '\ncallback_port = '+callback.port : ''}`;
  }
  const callback = setup.redirectUris.map(s => new URL(s)).find(u => u.hostname === 'localhost' && u.pathname === '/callback' && u.port);
  if (!callback) throw new Error('O operador precisa registrar o callback localhost /callback com porta fixa para Claude Code.');
  return JSON.stringify({ mcpServers: { oriens: { type: 'http', url: setup.resource, oauth: {
    clientId: setup.clientId, callbackPort: Number(callback.port), scopes: setup.scopes.join(' '),
  } } } }, null, 2);
}
