export interface McpPage<T> { items: T[]; page: number; pageSize: number; totalElements: number; hasNext: boolean }
export interface McpProject { id: number; title: string; archived: boolean }
export interface McpConnection {
  id: string; clientId: string; name: string; version: number; policyRevision: number;
  allowStandaloneTasks: boolean; allowedProjectIds: number[]; allowedProjects: McpProject[]; scopes: string[];
  createdAt: string; authorizedAt: string; expiresAt: string; lastUsedAt: string | null; revokedAt: string | null;
}
export type McpClient = 'codex' | 'claude-code' | 'other';
export interface McpSetup {
  client: McpClient; resource: string; issuer: string; clientId?: string;
  redirectUris: string[]; scopes: string[]; auditRetentionDays: number; registrationRequired?: boolean;
}
export interface McpAuthorization {
  id: string; version: number; clientId: string; clientName: string; requestedScopes: string[]; expiresAt: string;
}
export interface McpPermissions { scopes: string[]; allowedProjectIds: number[]; allowStandaloneTasks: boolean }
export interface McpEvent {
  id: string; occurred_at: string; action: string; result: string; request_id: string;
  resource_ids: string[]; field_names: string[]; result_count: number | null; duration_ms: number | null;
}
