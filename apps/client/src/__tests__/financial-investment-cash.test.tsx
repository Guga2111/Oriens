import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PeriodOverview } from '@/components/financial/PeriodOverview';
import { EntryHistoryTable } from '@/components/financial/EntryHistoryTable';
import { byTag, summarizeMonth, summarizeThrough, transfersInMonth, weeklyFlow } from '@/lib/financialSummary';
import type { EntryDTO, TagDTO } from '@/types/financial';

const tags: TagDTO[] = [{ id: 1, name: 'Salário', color: '#111111' }, { id: 2, name: 'Mercado', color: '#222222' }, { id: 9, name: 'Investimentos', color: '#8B5CF6' }];
const november = { month: 10, year: 2026 };
const entries: EntryDTO[] = [
  { id: 1, version: 0, amount: 4000, entryDate: '2026-11-05', tagId: 1 },
  { id: 2, version: 0, amount: -2500, entryDate: '2026-11-06', tagId: 2 },
  { id: 3, version: 0, amount: -1000, entryDate: '2026-11-07', tagId: 9, kind: 'INVESTMENT_TRANSFER', investmentId: 4, description: 'Aporte: CDB' },
  { id: 4, version: 0, amount: 300, entryDate: '2026-11-20', tagId: 9, kind: 'INVESTMENT_TRANSFER', investmentId: 4, description: 'Resgate: CDB' },
  { id: 5, version: 0, amount: 100, entryDate: '2026-11-21', tagId: 9, kind: 'INVESTMENT_INCOME', investmentId: 4, description: 'Rendimento: CDB' },
  // A standard entry with the Investimentos tag keeps its classification.
  { id: 6, version: 0, amount: -50, entryDate: '2026-11-22', tagId: 9, kind: 'STANDARD', description: 'Taxa de custódia' },
];

describe('transferências de investimento nas somas', () => {
  it('ficam fora de receitas, despesas, resultado, composição e semanas, e dentro do saldo disponível', () => {
    expect(summarizeMonth(entries, november)).toEqual({ income: 4100, expenses: 2550, balance: 1550 });
    expect(summarizeThrough(entries, november).balance).toBe(850);
    expect(byTag(entries, tags).map(tag => [tag.name, tag.amount])).toEqual([['Mercado', 2500], ['Investimentos', 50]]);
    expect(weeklyFlow(entries)).toEqual([
      { label: '1–7', income: 4000, expenses: 2500 },
      { label: '8–14', income: 0, expenses: 0 },
      { label: '15–21', income: 100, expenses: 0 },
      { label: '22–fim', income: 0, expenses: 50 },
    ]);
  });

  it('resumem aportes e resgates do mês com a tag da conta', () => {
    expect(transfersInMonth(entries, november)).toEqual({ contributions: 1000, withdrawals: 300, net: -700, tagId: 9 });
    expect(transfersInMonth(entries, { month: 9, year: 2026 })).toEqual({ contributions: 0, withdrawals: 0, net: 0, tagId: null });
  });
});

describe('Visão geral — transferências', () => {
  it('mostra aportes, resgates e efeito no saldo e abre o histórico do mês na tag Investimentos', async () => {
    const user = userEvent.setup();
    const onSelectCategory = vi.fn();
    render(<PeriodOverview entries={entries} tags={tags} period={november} isLoading={false} error={null} onRetry={vi.fn()}
      onNewEntry={vi.fn()} onSelectCategory={onSelectCategory} onViewMonth={vi.fn()} />);

    const value = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;
    expect(value('Receitas')).toHaveTextContent('R$ 4.100,00');
    expect(value('Despesas')).toHaveTextContent('R$ 2.550,00');
    expect(value('Saldo disponível')).toHaveTextContent('R$ 850,00');
    expect(value('Aportes')).toHaveTextContent('R$ 1.000,00');
    expect(value('Resgates')).toHaveTextContent('R$ 300,00');
    expect(value('Efeito no saldo')).toHaveClass('text-negative');

    await user.click(screen.getByRole('button', { name: /Ver transferências de novembro no histórico/ }));
    expect(onSelectCategory).toHaveBeenCalledWith(9);
  });
});

describe('Histórico — lançamentos da carteira', () => {
  it('mostra tipo e sinal, corrige pela carteira e mantém comum o lançamento com a mesma tag', async () => {
    const user = userEvent.setup();
    const onManageInvestments = vi.fn(), onEdit = vi.fn();
    render(<TooltipProvider><EntryHistoryTable entries={entries.slice(2)} tags={tags} onEdit={onEdit} onDelete={vi.fn()}
      onManageRecurrences={vi.fn()} onManageInvestments={onManageInvestments} filtered={false} onClearFilters={vi.fn()}
      pagination={{ page: 0, totalPages: 1, totalElements: 4 }} onPageChange={vi.fn()} /></TooltipProvider>);

    const table = within(screen.getByRole('table'));
    const row = (text: string) => within(table.getByText(text).closest('tr')!);
    expect(row('Aporte: CDB').getByText('Aporte')).toBeInTheDocument();
    expect(row('Aporte: CDB').getByText('− R$ 1.000,00')).toHaveClass('text-negative');
    expect(row('Resgate: CDB').getByText('Resgate')).toBeInTheDocument();
    expect(row('Resgate: CDB').getByText('+ R$ 300,00')).toBeInTheDocument();
    expect(row('Rendimento: CDB').getByText('Rendimento')).toBeInTheDocument();
    expect(row('Aporte: CDB').queryByRole('button', { name: /Excluir/ })).toBeNull();

    await user.click(row('Aporte: CDB').getByRole('button', { name: 'Corrigir em Investimentos: Aporte: CDB' }));
    expect(onManageInvestments).toHaveBeenCalledTimes(1);

    expect(row('Taxa de custódia').queryByText('Aporte')).toBeNull();
    await user.click(row('Taxa de custódia').getByRole('button', { name: 'Editar entrada: Taxa de custódia' }));
    expect(onEdit).toHaveBeenCalledWith(entries[5]);
  });
});
