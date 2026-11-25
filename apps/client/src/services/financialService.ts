import apiClient from './api';
import { queryClient } from '@/lib/query-client';

/** Cash entries, statistics and the portfolio share the `financial` family: a write in one refreshes the others. */
export function financialChanged(userId: number) {
  void queryClient.invalidateQueries({ predicate: query => query.queryKey[0] === 'work' && query.queryKey[1] === userId && (query.queryKey[2] === 'financial'
    || query.queryKey[2] === 'statistics' && ['finance', 'financial-evidence'].includes(String(query.queryKey[3]))) });
}
import { EntryDTO, FinancialInput, TagDTO, Page } from '@/types/financial';

/** Never spread read-only response fields into a write. Keys are owned by the UI intention. */
function input(entry: FinancialInput) {
  return { amount: entry.amount, entryDate: entry.entryDate, description: entry.description ?? null,
    tagId: entry.tagId, isRecurring: entry.isRecurring ?? false,
    recurrencePattern: entry.recurrencePattern ?? null, recurrenceEndDate: entry.recurrenceEndDate ?? null };
}
export function preconditions(key: string, version?: number) {
  if (!key) throw new Error('A intenção financeira precisa de uma chave de repetição.');
  if (version !== undefined && (!Number.isSafeInteger(version) || version < 0)) throw new Error('Recarregue o lançamento para obter sua versão.');
  return { 'Idempotency-Key': key, ...(version !== undefined ? { 'If-Match': `"${version}"` } : {}) };
}
export const createEntry = async (userId: number, entry: FinancialInput, key: string): Promise<EntryDTO> => {
  const response = await apiClient.post(`/financial/user/${userId}/entries`, input(entry), { headers: preconditions(key) });
  financialChanged(userId);
  return response.data;
};

export const getEntry = async (userId: number, entryId: number): Promise<EntryDTO> => {
  const response = await apiClient.get(`/financial/user/${userId}/entries/${entryId}`);
  return response.data;
};

export const getAllEntries = async (
  userId: number,
  params: {
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: 'ASC' | 'DESC';
    startDate?: string;
    endDate?: string;
    tagId?: number;
    search?: string;
  },
  signal?: AbortSignal
): Promise<Page<EntryDTO>> => {
  const response = await apiClient.get(`/financial/user/${userId}/entries`, { params, signal });
  return response.data;
};

const LEDGER_PAGE_SIZE = 500;

/** Full account history in stable id order; any failed page rejects the whole read, so no partial total escapes. */
export const getEntryLedger = async (userId: number, signal?: AbortSignal): Promise<EntryDTO[]> => {
  const page = (index: number) => getAllEntries(userId, { page: index, size: LEDGER_PAGE_SIZE, sortBy: 'id', direction: 'ASC' }, signal);
  const first = await page(0);
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => page(index + 1)));
  if (rest.some(result => result.totalElements !== first.totalElements)) throw new Error('O histórico mudou durante a leitura. Recarregue os dados.');
  return [first, ...rest].flatMap(result => result.content);
};

export const updateEntry = async (userId: number, entryId: number, entry: EntryDTO, key: string): Promise<EntryDTO> => {
  if (entry.version === undefined) throw new Error('Recarregue o lançamento para obter sua versão.');
  const response = await apiClient.put(`/financial/user/${userId}/entries/${entryId}`, input(entry), { headers: preconditions(key, entry.version) });
  financialChanged(userId);
  return response.data;
};

export const deleteEntry = async (userId: number, entryId: number, version: number, key: string): Promise<void> => {
  if (version === undefined) throw new Error('Recarregue o lançamento para obter sua versão.');
  await apiClient.delete(`/financial/user/${userId}/entries/${entryId}`, { headers: preconditions(key, version) });
  financialChanged(userId);
};

export const countEntries = async (userId: number): Promise<number> => {
  const response = await apiClient.get(`/financial/user/${userId}/entries/count`);
  return response.data;
};

export const createTag = async (userId: number, tag: TagDTO): Promise<TagDTO> => {
  const response = await apiClient.post(`/financial/user/${userId}/tags`, tag);
  financialChanged(userId);
  return response.data;
};

export const getTag = async (userId: number, tagId: number): Promise<TagDTO> => {
  const response = await apiClient.get(`/financial/user/${userId}/tags/${tagId}`);
  return response.data;
};

export const getAllTags = async (userId: number): Promise<TagDTO[]> => {
  const response = await apiClient.get(`/financial/user/${userId}/tags`);
  return response.data;
};

export const getDefaultTags = async (userId: number): Promise<TagDTO[]> => {
  const response = await apiClient.get(`/financial/user/${userId}/tags/default`);
  return response.data;
};

export const getCustomTags = async (userId: number): Promise<TagDTO[]> => {
  const response = await apiClient.get(`/financial/user/${userId}/tags/custom`);
  return response.data;
};

export const updateTag = async (userId: number, tagId: number, tag: TagDTO): Promise<TagDTO> => {
  const response = await apiClient.put(`/financial/user/${userId}/tags/${tagId}`, tag);
  financialChanged(userId);
  return response.data;
};

export const deleteTag = async (userId: number, tagId: number): Promise<void> => {
  await apiClient.delete(`/financial/user/${userId}/tags/${tagId}`);
  financialChanged(userId);
};

export const getRecurringEntries = async (userId: number): Promise<EntryDTO[]> => {
  const response = await apiClient.get(`/financial/user/${userId}/entries/recurring`);
  return response.data;
};
