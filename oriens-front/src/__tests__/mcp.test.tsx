import { beforeEach, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWork } from './work-fixtures';
import { McpConsent } from '@/components/settings/mcp/McpConsent';
import { McpConnectionDialog } from '@/components/settings/mcp/McpConnectionDialog';
import { mcpService } from '@/services/mcpService';
import { mcpSetupText } from '@/lib/mcp-setup';
import { emptyPermissions, mcpFlow, mcpResume, toggleScope } from '@/lib/mcp';
import type { McpConnection, McpSetup } from '@/types/mcp';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7, userEmail: 'fixture@example.invalid' }) }));
vi.mock('@/services/mcpService', () => ({ mcpService: { authorization: vi.fn(), decide: vi.fn(), connection: vi.fn(), patch: vi.fn(), revoke: vi.fn(), events: vi.fn() } }));
const id = 'a72b8bad-2c72-4f35-bfaa-48543de42624';
const connection: McpConnection = { id, clientId: 'oriens-codex', name: 'Revisão semanal', version: 3, policyRevision: 1,
  scopes: ['mcp:context', 'finance:read', 'finance:create'], allowedProjectIds: [], allowedProjects: [], allowStandaloneTasks: false,
  createdAt: '2026-11-16T12:00:00Z', authorizedAt: '2026-11-16T12:00:00Z', expiresAt: '2099-12-16T12:00:00Z', lastUsedAt: null, revokedAt: null };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(mcpService.events).mockResolvedValue({ items: [], page: 0, pageSize: 5, totalElements: 0, hasNext: false }); });

it('retoma somente UUID em rota local fixa e recusa parâmetros duplicados ou destinos arbitrários', () => {
  expect(mcpResume(`?mcpFlow=${id}&returnTo=https://evil.invalid`)).toBe(`/config?mcpFlow=${id}`);
  for (const search of ['?mcpFlow=https://evil.invalid', '?returnTo=//evil.invalid', `?mcpFlow=${id}&mcpFlow=${id}`]) {
    expect(mcpFlow(search)).toBeNull(); expect(mcpResume(search)).toBe('/tasks');
  }
});

it('não acrescenta leitura não solicitada e remove escritas quando a leitura é retirada', () => {
  const empty = emptyPermissions();
  expect(toggleScope(empty, 'finance:create', true, ['finance:create'])).toEqual(empty);
  const granted = toggleScope(empty, 'finance:create', true, ['finance:create', 'finance:read']);
  expect(granted.scopes).toEqual(expect.arrayContaining(['finance:read', 'finance:create']));
  expect(toggleScope(granted, 'finance:read', false, granted.scopes)).toEqual(empty);
  expect(toggleScope({ scopes: ['mcp:context','projects:read','tasks:read'], allowedProjectIds: [9], allowStandaloneTasks: true }, 'projects:read', false, []).allowedProjectIds).toEqual([]);
});

it('consentimento começa negado, conserva seleção em erro e cancela sem exigir nome válido', async () => {
  const user = userEvent.setup();
  vi.mocked(mcpService.authorization).mockResolvedValue({ id, version: 4, clientId: 'oriens-codex', clientName: 'Codex', requestedScopes: ['mcp:context','finance:read','finance:create'], expiresAt: new Date(Date.now()+600000).toISOString() });
  vi.mocked(mcpService.decide).mockRejectedValue({ isAxiosError: true, message: 'offline' });
  renderWork(<McpConsent flowId={id} />, `/config?mcpFlow=${id}`);
  const read = await screen.findByRole('checkbox', { name: 'Consultar finanças' });
  expect(read).not.toBeChecked(); expect(screen.getByRole('checkbox', { name: 'Excluir lançamentos' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: 'Criar lançamentos' }));
  expect(read).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Autorizar conexão' }));
  await screen.findByRole('alert'); expect(read).toBeChecked();
  expect(mcpService.decide).toHaveBeenLastCalledWith(id, expect.objectContaining({ version: 4, approve: true, scopes: expect.arrayContaining(['finance:read','finance:create']), allowedProjectIds: [], allowStandaloneTasks: false }));
  await user.clear(screen.getByLabelText('Nome da conexão'));
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(mcpService.decide).toHaveBeenLastCalledWith(id, expect.objectContaining({ approve: false })));
});

it('fluxo inválido não consulta o backend nem envia decisão', async () => {
  renderWork(<McpConsent flowId={null} />); expect(mcpService.authorization).not.toHaveBeenCalled();
  expect(screen.getByText(/Solicitação inválida/)).toBeInTheDocument();
});

it('solicitação expirada bloqueia decisão e mantém retorno local', async () => {
  vi.mocked(mcpService.authorization).mockResolvedValue({ id, version: 0, clientId: 'oriens-codex', clientName: 'Codex', requestedScopes: ['mcp:context'], expiresAt: new Date(Date.now()-1000).toISOString() });
  renderWork(<McpConsent flowId={id} />, `/config?mcpFlow=${id}`);
  expect(await screen.findByRole('button', { name: 'Autorizar conexão' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Voltar às configurações' })).toHaveAttribute('href', '/config');
  expect(mcpService.decide).not.toHaveBeenCalled();
});

it('conflito preserva rascunho e versão até recarga explícita; salvar não amplia escopos', async () => {
  const user = userEvent.setup(); vi.mocked(mcpService.connection).mockResolvedValue(connection);
  vi.mocked(mcpService.patch).mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: { code: 'VERSION_CONFLICT' } } });
  renderWork(<McpConnectionDialog id={id} onClose={vi.fn()} onExpand={vi.fn()} />);
  const name = await screen.findByLabelText('Nome da conexão');
  await user.clear(name); await user.type(name, 'Rascunho preservado');
  expect(screen.getByRole('checkbox', { name: 'Excluir lançamentos' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Salvar permissões' }));
  await screen.findByRole('button', { name: 'Descartar rascunho e recarregar' });
  expect(name).toHaveValue('Rascunho preservado'); expect(screen.getByRole('button', { name: 'Salvar permissões' })).toBeDisabled();
  expect(mcpService.patch).toHaveBeenCalledWith(id, expect.objectContaining({ name: 'Rascunho preservado', version: 3, scopes: connection.scopes }));
  vi.mocked(mcpService.connection).mockResolvedValue({ ...connection, name: 'Alterado pela outra sessão', version: 4 });
  await user.click(screen.getByRole('button', { name: 'Descartar rascunho e recarregar' }));
  await waitFor(() => expect(screen.getByLabelText('Nome da conexão')).toHaveValue('Alterado pela outra sessão'));
});

it('configuração usa registro/callback do ambiente e outro cliente exige seu próprio registro', () => {
  const setup: McpSetup = { client: 'codex', resource: 'https://api.oriens.test/mcp', issuer: 'https://api.oriens.test', clientId: 'oriens-codex', redirectUris: ['http://127.0.0.1/callback'], scopes: ['mcp:context','tasks:read'], auditRetentionDays: 90 };
  expect(mcpSetupText(setup)).toContain('callback_url = "http://127.0.0.1/callback"');
  const claude = JSON.parse(mcpSetupText({ ...setup, client: 'claude-code', clientId: 'oriens-claude-code', redirectUris: ['http://localhost:8765/callback'] }));
  expect(claude.mcpServers.oriens.oauth).toEqual({ clientId: 'oriens-claude-code', callbackPort: 8765, scopes: 'mcp:context tasks:read' });
  expect(mcpSetupText({ ...setup, client: 'other', clientId: undefined })).toContain('registro público próprio');
  expect(mcpSetupText({ ...setup, client: 'other', clientId: undefined })).not.toContain('oriens-codex');
});
