import { format, parseISO } from 'date-fns';
import { centsAmount, moneyCents } from '@/lib/money';
import type { AssetClass, Investment, InvestmentSummary, Movement, MovementType, PositionStatus } from '@/types/investment';

export const ASSET_CLASS: Record<AssetClass, string> = {
  FIXED_INCOME: 'Renda fixa',
  STOCKS: 'Ações',
  REAL_ESTATE_FUNDS: 'Fundos imobiliários',
  OTHER: 'Outros',
};
export const ASSET_CLASS_ORDER: readonly AssetClass[] = ['FIXED_INCOME', 'STOCKS', 'REAL_ESTATE_FUNDS', 'OTHER'];

/** What each movement means for the cash history, stated next to the type choice and in the toast. */
export const MOVEMENT_TYPE: Record<MovementType, { label: string; cash: string; saved: string }> = {
  CONTRIBUTION: { label: 'Aporte', cash: 'Sai do saldo disponível como transferência.', saved: 'Aporte registrado' },
  WITHDRAWAL: { label: 'Resgate', cash: 'Volta ao saldo disponível como transferência.', saved: 'Resgate registrado' },
  INCOME: { label: 'Rendimento recebido', cash: 'Entra como receita e não altera a posição.', saved: 'Rendimento registrado' },
};
export const MOVEMENT_TYPE_ORDER: readonly MovementType[] = ['CONTRIBUTION', 'WITHDRAWAL', 'INCOME'];

/** The cash history line that the API created for the movement, as the toast announces it. */
export function movementHistoryNote(type: MovementType): string {
  return type === 'INCOME'
    ? 'O histórico recebeu uma receita com a tag Investimentos.'
    : 'O histórico recebeu uma transferência com a tag Investimentos.';
}

export const POSITION_STATUS: Record<PositionStatus, { label: string; hint: string; badge: 'outline' | 'warning' | 'secondary' }> = {
  VALUED: { label: 'Avaliada', hint: 'Valor da última avaliação.', badge: 'outline' },
  ESTIMATED: { label: 'Estimada', hint: 'Última avaliação ajustada pelos aportes e resgates posteriores.', badge: 'secondary' },
  NEEDS_VALUATION: { label: 'A avaliar', hint: 'Os resgates passaram do valor avaliado. Informe uma nova avaliação.', badge: 'warning' },
  UNAVAILABLE: { label: 'Sem avaliação', hint: 'Informe uma avaliação para incluir a aplicação no total.', badge: 'warning' },
};

/** Signed cash effect of a movement as the history shows it: a contribution leaves the balance. */
export function movementCash(movement: Pick<Movement, 'type' | 'amount'>): string {
  return movement.type === 'CONTRIBUTION' ? centsAmount(-moneyCents(movement.amount)) : movement.amount;
}

export interface ClassShare {
  assetClass: AssetClass;
  total: string;
  investments: number;
  /** Integer share of the covered total (0–100); geometry only, the text carries the value. */
  percent: number;
}

/** Composition over the covered total, computed in cents so the shares match the API totals. */
export function classShares(composition: { assetClass: AssetClass; total: string; investments: number }[]): ClassShare[] {
  const total = composition.reduce((sum, item) => sum + moneyCents(item.total), 0n);
  return composition.map(item => ({
    ...item,
    percent: total > 0n ? Number((moneyCents(item.total) * 1000n / total + 5n) / 10n) : 0,
  }));
}

const MAX_AMOUNT = 9999999999.99;

/** Accepts the decimal comma typed in pt-BR ("1234,56") as well as a dot. */
export function normalizedAmount(value: string): string {
  return value.trim().replace(',', '.');
}

/** Mirrors the API: two decimals, up to 9.999.999.999,99; valuations accept zero, movements do not. */
export function investmentAmountError(value: string, allowZero: boolean): string | null {
  const text = normalizedAmount(value);
  if (!text) return 'Informe o valor em reais.';
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text) || Number(text) > MAX_AMOUNT)
    return 'Use um valor positivo de até 9.999.999.999,99, com no máximo duas casas decimais.';
  if (!allowZero && Number(text) === 0) return 'Informe um valor maior que zero.';
  return null;
}

export function investmentNameError(value: string): string | null {
  const text = value.trim();
  if (!text) return 'Informe o nome da aplicação.';
  if (text.length > 120) return 'Use até 120 caracteres.';
  return null;
}

export function isAssetClass(value: string): value is AssetClass {
  return (ASSET_CLASS_ORDER as readonly string[]).includes(value);
}
export function isMovementType(value: string): value is MovementType {
  return (MOVEMENT_TYPE_ORDER as readonly string[]).includes(value);
}

/** Coverage is explicit: positions without a valuation stay out of the total and are counted here. */
export function coverageText(summary: Pick<InvestmentSummary, 'covered' | 'investments'>): string {
  const { covered, investments } = summary;
  if (covered === investments) return investments === 1 ? 'Cobre a única aplicação' : `Cobre as ${investments} aplicações`;
  return `Total parcial: cobre ${covered} de ${investments} aplicações`;
}

export function lastValuationText(investment: Pick<Investment, 'lastValuation'>): string {
  return investment.lastValuation
    ? `Avaliada em ${format(parseISO(investment.lastValuation.valuedOn), 'dd/MM/yyyy')}`
    : 'Sem avaliação';
}
