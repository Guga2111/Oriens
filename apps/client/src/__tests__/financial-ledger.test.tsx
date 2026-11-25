import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { getEntryLedger } from '@/services/financialService';
import FinancialPage from '@/pages/FinancialPage';
import { renderWork } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/lib/product-time', async original => ({
  ...(await original<typeof import('@/lib/product-time')>()),
  productDate: (date = '2026-11-25') => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d); },
}));

const tags = [{ id: 1, name: 'Salário', color: '#111111' }, { id: 2, name: 'Mercado', color: '#222222' }];
const page = (content: unknown[], number: number, totalPages: number, totalElements: number) =>
  ({ data: { content, number, totalPages, totalElements, size: 500, first: number === 0, last: number === totalPages - 1 } });

beforeEach(() => { vi.resetAllMocks(); });

describe('getEntryLedger — histórico completo', () => {
  it('lê todas as páginas em ordem estável de id', async () => {
    vi.mocked(api.get).mockImplementation(async (_url, config) => {
      const index = (config?.params as { page: number }).page;
      return page([{ id: index + 1 }], index, 3, 3);
    });

    await expect(getEntryLedger(7)).resolves.toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(api.get).toHaveBeenCalledTimes(3);
    for (const call of vi.mocked(api.get).mock.calls) {
      expect(call[0]).toBe('/financial/user/7/entries');
      expect(call[1]?.params).toMatchObject({ size: 500, sortBy: 'id', direction: 'ASC' });
    }
  });

  it('falha inteira quando qualquer página falha', async () => {
    vi.mocked(api.get).mockImplementation(async (_url, config) => {
      const index = (config?.params as { page: number }).page;
      if (index === 1) throw new Error('offline');
      return page([{ id: index + 1 }], index, 2, 2);
    });

    await expect(getEntryLedger(7)).rejects.toThrow('offline');
  });

  it('recusa leitura em que o total muda entre páginas', async () => {
    vi.mocked(api.get).mockImplementation(async (_url, config) => {
      const index = (config?.params as { page: number }).page;
      return page([{ id: index + 1 }], index, 2, index === 0 ? 2 : 3);
    });

    await expect(getEntryLedger(7)).rejects.toThrow('O histórico mudou');
  });
});

describe('FinancialPage — categoria abre o histórico filtrado', () => {
  it('aplica o mês selecionado e a categoria ao abrir Lançamentos', async () => {
    const user = userEvent.setup();
    const entries = [
      { id: 1, version: 0, amount: 3000, entryDate: '2026-11-05', tagId: 1 },
      { id: 2, version: 0, amount: -120.4, entryDate: '2026-11-08', tagId: 2 },
      { id: 3, version: 0, amount: -80, entryDate: '2026-10-08', tagId: 2 },
    ];
    vi.mocked(api.get).mockImplementation(async (url, config) => {
      if (url.endsWith('/tags')) return { data: tags };
      const params = config?.params as { sortBy: string };
      if (params.sortBy === 'id') return page(entries, 0, 1, entries.length);
      return page([entries[2]], 0, 1, 1);
    });
    renderWork(<FinancialPage />, '/financial');

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    const category = await screen.findByRole('button', { name: /^Mercado: R\$\s80,00/ });
    await user.click(category);

    expect(screen.getByRole('tab', { name: 'Lançamentos' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/financial/user/7/entries', expect.objectContaining({
      params: expect.objectContaining({ startDate: '2026-10-01', endDate: '2026-10-31', tagId: 2, page: 0 }),
    })));
    const history = screen.getByRole('tabpanel', { name: 'Lançamentos' });
    expect(within(history).getByRole('combobox', { name: 'Filtrar por período' })).toHaveTextContent('Personalizado');
  });
});
