import { isAxiosError } from 'axios';
import type { McpConnection, McpPermissions } from '@/types/mcp';

export const permissionGroups = [
  { title: 'Projetos', note: 'Metadados, objetivos e estrutura dos projetos selecionados.', actions: [
    ['projects:read', 'Consultar projetos'], ['projects:create', 'Criar projetos'], ['projects:update', 'Editar e arquivar projetos'], ['projects:delete', 'Excluir projetos'],
    ['objectives:create', 'Criar objetivos'], ['objectives:update', 'Editar e concluir objetivos'], ['objectives:delete', 'Excluir objetivos'],
  ] },
  { title: 'Tarefas', note: 'Inclui descrições e localizações das tarefas autorizadas.', actions: [
    ['tasks:read', 'Consultar tarefas'], ['tasks:create', 'Criar tarefas'], ['tasks:update', 'Editar, planejar e mover tarefas'], ['tasks:delete', 'Excluir tarefas'],
  ] },
  { title: 'Finanças', note: 'Acesso aos lançamentos, categorias e totais de toda a sua conta, independente dos projetos.', actions: [
    ['finance:read', 'Consultar finanças'], ['finance:create', 'Criar lançamentos'], ['finance:update', 'Editar lançamentos e recorrências'], ['finance:delete', 'Excluir lançamentos'],
  ] },
] as const;
export const scopeLabel = (scope: string) => permissionGroups.flatMap<readonly [string, string]>(g => g.actions).find(a => a[0] === scope)?.[1]
  ?? (scope === 'offline_access' ? 'Manter renovação por até 30 dias' : 'Contexto mínimo da conexão');
export function dependencies(scope: string): string[] {
  if (scope.startsWith('objectives:') || ['projects:update', 'projects:delete'].includes(scope)) return ['projects:read'];
  if (scope.startsWith('tasks:') && scope !== 'tasks:read') return ['tasks:read'];
  if (scope.startsWith('finance:') && scope !== 'finance:read') return ['finance:read'];
  return [];
}
export const emptyPermissions = (): McpPermissions => ({ scopes: ['mcp:context'], allowedProjectIds: [], allowStandaloneTasks: false });
/** Every dependency must have been requested. Removing a read also removes its dependent writes. */
export function toggleScope(value: McpPermissions, scope: string, checked: boolean, available: readonly string[]): McpPermissions {
  const scopes = new Set(value.scopes);
  if (checked) {
    if (![scope, ...dependencies(scope)].every(s => available.includes(s))) return value;
    [scope, ...dependencies(scope)].forEach(s => scopes.add(s));
  } else {
    scopes.delete(scope);
    [...scopes].forEach(s => { if (dependencies(s).includes(scope)) scopes.delete(s); });
  }
  scopes.add('mcp:context');
  return { scopes: [...scopes], allowedProjectIds: scopes.has('projects:read') ? value.allowedProjectIds : [],
    allowStandaloneTasks: scopes.has('tasks:read') && value.allowStandaloneTasks };
}
export function mcpFlow(search: string): string | null {
  const params = new URLSearchParams(search), values = params.getAll('mcpFlow');
  return values.length === 1 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(values[0]) ? values[0] : null;
}
export const mcpResume = (search: string) => { const id = mcpFlow(search); return id ? `/config?mcpFlow=${id}` : '/tasks'; };
export function clientName(id: string) {
  switch (id) {
    case 'oriens-codex': return 'Codex';
    case 'oriens-claude-code': return 'Claude Code';
    case 'oriens-openbot': return 'OpenBot';
    default: return 'Outro cliente';
  }
}
export const connectionStatus = (c: McpConnection) => c.revokedAt ? 'Revogada' : Date.parse(c.expiresAt) <= Date.now() ? 'Expirada' : 'Ativa';
export const mcpDate = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Recife' }).format(new Date(value)) : 'Ainda não utilizada';
export const mcpErrorCode = (error: unknown) => isAxiosError(error) ? error.response?.data?.code : undefined;
export const mcpUnavailableMessage = 'MCP ainda não está habilitado neste ambiente. As demais integrações continuam disponíveis.';
export function mcpSetupError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 404) return mcpUnavailableMessage;
    if (error.response?.status === 401) return mcpError(error);
    if (error.response?.status === 403) return 'Sua conta não tem acesso à configuração MCP deste ambiente.';
    if (error.response?.data?.message) return error.response.data.message;
  }
  return 'Não foi possível carregar a configuração do cliente. Tente novamente.';
}
export function mcpError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (error.response?.status === 409) return 'A conexão mudou em outra sessão. Seu rascunho foi mantido. Descarte o rascunho e recarregue para revisar o acesso atual.';
    if ([403, 404].includes(error.response?.status ?? 0)) return 'Solicitação indisponível, expirada ou sem acesso neste navegador. Inicie uma nova autorização pelo cliente.';
    if (error.response?.data?.message) return error.response.data.message;
  }
  return 'Não foi possível confirmar a operação. Suas escolhas foram mantidas. Tente novamente ou recarregue para conferir o estado atual.';
}
