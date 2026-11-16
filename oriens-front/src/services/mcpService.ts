import api from './api';
import type { McpAuthorization, McpClient, McpConnection, McpEvent, McpPage, McpPermissions, McpSetup } from '@/types/mcp';
const base = '/integrations/mcp';
export const mcpService = {
  setup: async (client: McpClient, signal?: AbortSignal) => (await api.get<McpSetup>(`${base}/setup`, { params: { client }, signal })).data,
  connections: async (page: number, signal?: AbortSignal) => (await api.get<McpPage<McpConnection>>(`${base}/connections`, { params: { page, pageSize: 5 }, signal })).data,
  connection: async (id: string, signal?: AbortSignal) => (await api.get<McpConnection>(`${base}/connections/${id}`, { signal })).data,
  patch: async (id: string, body: McpPermissions & { version: number; name: string }) => (await api.patch<McpConnection>(`${base}/connections/${id}`, body)).data,
  revoke: async (id: string, version: number) => (await api.post<McpConnection>(`${base}/connections/${id}/revoke`, { version })).data,
  events: async (id: string, page: number, result: string, signal?: AbortSignal) => (await api.get<McpPage<McpEvent>>(`${base}/connections/${id}/events`, { params: { page, pageSize: 5, result: result || undefined }, signal })).data,
  authorization: async (id: string, signal?: AbortSignal) => (await api.get<McpAuthorization>(`${base}/authorization-requests/${id}`, { withCredentials: true, signal })).data,
  decide: async (id: string, body: McpPermissions & { version: number; approve: boolean; name: string }) =>
    (await api.post<{ redirectUrl: string }>(`${base}/authorization-requests/${id}/decision`, body, { withCredentials: true })).data,
};
