import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { getEntryLedger } from '@/services/financialService';
import { Route, Routes, useLocation } from 'react-router-dom';
import FinancialPage from '@/pages/FinancialPage';
import FinancialEntriesPage from '@/pages/FinancialEntriesPage';
import { renderWork } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/lib/product-time', async original => ({
  ...(await original<typeof import('@/lib/product-time')>()),
  productDate: (date = '2026-11-25') => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d); },
}));

function Location() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

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

describe('Financeiro — categoria abre Lançamentos filtrado', () => {
  it('leva o mês selecionado e a categoria pela URL até o histórico', async () => {
    const user = userEvent.setup();
    const entries = [
      { id: 1, version: 0, amount: 3000, entryDate: '2026-11-05', tagId: 1 },
      { id: 2, version: 0, amount: -120.4, entryDate: '2026-11-08', tagId: 2 },
      { id: 3, version: 0, amount: -80, entryDate: '2026-10-08', tagId: 2, description: 'Feira' },
    ];
    vi.mocked(api.get).mockImplementation(async (url, config) => {
      if (url.endsWith('/tags')) return { data: tags };
      const params = config?.params as { sortBy: string };
      if (params.sortBy === 'id') return page(entries, 0, 1, entries.length);
      return page([entries[2]], 0, 1, 1);
    });
    renderWork(<Routes>
      <Route path="/financial" element={<FinancialPage />} />
      <Route path="/financial/entries" element={<><FinancialEntriesPage /><Location /></>} />
    </Routes>, '/financial?month=2026-10');

    expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toHaveClass('sr-only');
    await user.click(await screen.findByRole('button', { name: /^Mercado: R\$\s80,00/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Lançamentos' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/financial/entries?start=2026-10-01&end=2026-10-31&tag=2');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/financial/user/7/entries', expect.objectContaining({
      params: expect.objectContaining({ startDate: '2026-10-01', endDate: '2026-10-31', tagId: 2, page: 0 }),
    })));
    expect(within(screen.getByRole('table')).getByText('Feira')).toBeInTheDocument();
  });
});
