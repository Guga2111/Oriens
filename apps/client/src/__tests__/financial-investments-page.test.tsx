import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import api from '@/services/api';
import FinancialInvestmentsPage from '@/pages/FinancialInvestmentsPage';
import { classShares, coverageText, investmentAmountError, movementCash } from '@/lib/investments';
import { queryClient } from '@/lib/query-client';
import { investmentService } from '@/services/investmentService';
import { renderWork } from './work-fixtures';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ userId: 7 }) }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/lib/product-time', async original => ({
  ...(await original<typeof import('@/lib/product-time')>()),
  productNow: () => ({ date: '2026-11-25', time: '12:00' }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const valuation = (id: number, investmentId: number, amount: string, valuedOn: string) =>
  ({ id, investmentId, amount, valuedOn, version: 0, createdAt: `${valuedOn}T10:00:00` });
const cdb = { id: 1, name: 'CDB Inter', assetClass: 'FIXED_INCOME', version: 2, position: '13000.00', positionStatus: 'ESTIMATED',
  lastValuation: valuation(11, 1, '15000.00', '2026-11-01'), createdAt: '2026-11-01T10:00:00' };
const fii = { id: 2, name: 'FII Logística', assetClass: 'REAL_ESTATE_FUNDS', version: 0, position: null, positionStatus: 'NEEDS_VALUATION',
  lastValuation: valuation(12, 2, '100.00', '2026-10-01'), createdAt: '2026-10-01T10:00:00' };
const summary = { total: '13000.00', covered: 1, investments: 2, netContributions: '-2000.00', incomeReceived: '100.00',
  composition: [{ assetClass: 'FIXED_INCOME', total: '13000.00', investments: 1 }] };
const withdrawal = { id: 21, investmentId: 1, type: 'WITHDRAWAL', amount: '2000.00', occurredOn: '2026-11-10', description: null,
  entryId: 31, version: 0, createdAt: '2026-11-10T10:00:00' };
const page = (content: unknown[]) => ({ data: { content, number: 0, totalPages: 1, totalElements: content.length, size: 50, first: true, last: true } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url.endsWith('/investments/summary')) return { data: summary };
    if (url.endsWith('/investments/movements')) return page([withdrawal]);
    if (url.endsWith('/valuations')) return page([valuation(11, 1, '15000.00', '2026-11-01'), valuation(10, 1, '14000.00', '2026-10-01')]);
    if (url.endsWith('/investments')) return page([cdb, fii]);
    throw new Error(`unexpected ${url}`);
  });
});

describe('regras da carteira', () => {
  it('valida valores como a API e calcula a composição em centavos', () => {
    expect(investmentAmountError('0', true)).toBeNull();
    expect(investmentAmountError('0', false)).toBe('Informe um valor maior que zero.');
    expect(investmentAmountError('1234,56', false)).toBeNull();
    expect(investmentAmountError('-1', true)).not.toBeNull();
    expect(investmentAmountError('1.234', true)).not.toBeNull();
    expect(investmentAmountError('10000000000', true)).not.toBeNull();
    expect(classShares([{ assetClass: 'STOCKS', total: '1.00', investments: 1 }, { assetClass: 'OTHER', total: '2.00', investments: 1 }])
      .map(share => share.percent)).toEqual([33, 67]);
    expect(movementCash({ type: 'CONTRIBUTION', amount: '10.50' })).toBe('-10.50');
    expect(movementCash({ type: 'WITHDRAWAL', amount: '10.50' })).toBe('10.50');
    expect(coverageText({ covered: 1, investments: 2 })).toBe('Total parcial: cobre 1 de 2 aplicações');
  });
});

describe('escritas da carteira', () => {
  it('exigem chave e versão e atualizam caixa, estatísticas e carteira juntos', async () => {
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(api.put).mockResolvedValue({ data: withdrawal });
    await investmentService.replaceMovement(7, withdrawal as never, { type: 'WITHDRAWAL', amount: 1, occurredOn: '2026-11-10', description: null }, 'k-1');
    expect(api.put).toHaveBeenCalledWith('/financial/user/7/investments/1/movements/21', expect.anything(),
      { headers: { 'Idempotency-Key': 'k-1', 'If-Match': '"0"' } });
    const predicate = (spy.mock.calls[0][0] as { predicate: (query: { queryKey: unknown[] }) => boolean }).predicate;
    expect(predicate({ queryKey: ['work', 7, 'financial', 'ledger'] })).toBe(true);
    expect(predicate({ queryKey: ['work', 7, 'financial', 'investments', 'summary'] })).toBe(true);
    expect(predicate({ queryKey: ['work', 7, 'statistics', 'finance'] })).toBe(true);
    expect(predicate({ queryKey: ['work', 8, 'financial', 'ledger'] })).toBe(false);
    await expect(investmentService.create(7, { name: 'X', assetClass: 'OTHER', initialValue: 0, valuedOn: '2026-11-25' }, '')).rejects.toThrow('chave');
  });
});

describe('Investimentos — carteira manual', () => {
  it('mostra os números da API, a data de cada posição e a cobertura parcial', async () => {
    renderWork(<FinancialInvestmentsPage />, '/financial/investments');

    const metric = async (label: string) => (await screen.findByText(label, { selector: 'dt' })).nextElementSibling;
    expect(await metric('Valor da carteira')).toHaveTextContent('R$ 13.000,00');
    expect(screen.getAllByText('Total parcial: cobre 1 de 2 aplicações', { exact: false }).length).toBeGreaterThan(0);
    expect(await metric('Aportes líquidos')).toHaveTextContent('−R$ 2.000,00');
    expect(await metric('Rendimentos recebidos')).toHaveTextContent('R$ 100,00');

    expect(screen.getByRole('button', { name: /^CDB Inter, Renda fixa\. Posição R\$\s13\.000,00, estimada\. Avaliada em 01\/11\/2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^FII Logística, Fundos imobiliários\. Posição A avaliar/ })).toBeInTheDocument();
    expect(screen.getByText('Renda fixa')).toBeInTheDocument();
    expect(screen.getByText('+ R$ 2.000,00')).toBeInTheDocument();
  });

  it('registra um aporte com chave de repetição e avisa que o histórico recebeu a transferência', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValueOnce({ isAxiosError: true, message: 'offline' })
      .mockResolvedValueOnce({ data: { ...withdrawal, id: 22, type: 'CONTRIBUTION', amount: '500.00' } });
    renderWork(<FinancialInvestmentsPage />, '/financial/investments');

    await user.click(await screen.findByRole('button', { name: 'Registrar movimento' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar movimento' }));
    expect(within(dialog).getByText('Informe o valor em reais.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('Valor'), '500,00');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar movimento' }));
    await within(dialog).findByText(/Confirmação indisponível/);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar movimento' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(api.post).mock.calls;
    expect(first).toEqual(second);
    expect(first[0]).toBe('/financial/user/7/investments/1/movements');
    expect(first[1]).toEqual({ type: 'CONTRIBUTION', amount: 500, occurredOn: '2026-11-25', description: null });
    expect(first[2]).toEqual({ headers: { 'Idempotency-Key': expect.any(String) } });
    expect(toast.success).toHaveBeenCalledWith('Aporte registrado', { description: 'O histórico recebeu uma transferência com a tag Investimentos.' });
  });

  it('abre o detalhe com histórico de avaliações e variação do valor informado', async () => {
    const user = userEvent.setup();
    renderWork(<FinancialInvestmentsPage />, '/financial/investments');

    await user.click(await screen.findByRole('button', { name: /^CDB Inter/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Estimada: Última avaliação ajustada pelos aportes e resgates posteriores.')).toBeInTheDocument();
    expect(await within(dialog).findByText('Variação do valor informado: +R$ 1.000,00')).toBeInTheDocument();
    expect(within(dialog).getByText('Primeira avaliação')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Corrigir avaliação de 01/10/2026' })).toBeInTheDocument();
  });

  it('exclui uma avaliação a partir do detalhe com versão e chave, mantendo a chave ao repetir', async () => {
    const user = userEvent.setup();
    vi.mocked(api.delete).mockRejectedValueOnce({ isAxiosError: true, message: 'offline' }).mockResolvedValueOnce({});
    renderWork(<FinancialInvestmentsPage />, '/financial/investments');

    await user.click(await screen.findByRole('button', { name: /^CDB Inter/ }));
    await user.click(await screen.findByRole('button', { name: 'Excluir avaliação de 01/10/2026' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText(/A posição volta a partir da avaliação anterior/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Excluir' }));
    expect(await within(confirm).findByRole('alert')).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(api.delete).mock.calls;
    expect(first).toEqual(second);
    expect(first).toEqual(['/financial/user/7/investments/1/valuations/10', { headers: { 'Idempotency-Key': expect.any(String), 'If-Match': '"0"' } }]);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('carteira vazia oferece cadastrar a primeira aplicação', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => url.endsWith('/summary')
      ? { data: { ...summary, total: '0.00', covered: 0, investments: 0, composition: [] } } : page([]));
    renderWork(<FinancialInvestmentsPage />, '/financial/investments');

    expect(await screen.findByText('Nenhuma aplicação na carteira')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar movimento' })).toBeNull();
  });
});
