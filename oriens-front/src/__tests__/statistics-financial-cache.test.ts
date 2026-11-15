import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { createEntry, updateEntry, deleteEntry, updateTag } from '@/services/financialService';
import { queryClient } from '@/lib/query-client';

vi.mock('@/services/api', () => ({ default: { post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const finance = ['work', 7, 'statistics', 'finance', { startDate: '2026-11-01', endDate: '2026-11-13' }];
const evidence = ['work', 7, 'statistics', 'financial-evidence', { startDate: '2026-11-01', endDate: '2026-11-13' }, 0];
const otherOwner = ['work', 8, 'statistics', 'finance'];
const habits = ['work', 7, 'statistics', 'habits'];
beforeEach(() => {
  queryClient.clear(); vi.clearAllMocks();
  for (const key of [finance, evidence, otherOwner, habits]) queryClient.setQueryData(key, { value: 12 });
  vi.mocked(api.post).mockResolvedValue({ data: { id: 1 } });
  vi.mocked(api.put).mockResolvedValue({ data: { id: 1 } });
  vi.mocked(api.delete).mockResolvedValue({});
});
describe('financeiro — mutações atualizam estatísticas da conta', () => {
  it.each(['create', 'update', 'delete', 'tag'] as const)('%s invalida totais e evidência sem invalidar outra conta ou hábitos', async action => {
    const entry = { amount: -12.34, entryDate: '2026-11-13', tagId: 1 };
    if (action === 'create') await createEntry(7, entry);
    if (action === 'update') await updateEntry(7, 1, entry);
    if (action === 'delete') await deleteEntry(7, 1);
    if (action === 'tag') await updateTag(7, 1, { name: 'Leitura', color: '#781336' });
    expect(queryClient.getQueryState(finance)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(evidence)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherOwner)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(habits)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryData(finance)).toEqual({ value: 12 });
  });
});
