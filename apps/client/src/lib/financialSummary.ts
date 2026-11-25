import type { EntryDTO, TagDTO } from "@/types/financial";

/**
 * Agregação da visão geral do Financeiro sobre o histórico completo da conta.
 * A agregação da API recusa datas futuras e intervalos acima de 366 dias, então
 * o saldo acumulado e os meses futuros são calculados aqui.
 *
 * Os valores são somados em centavos inteiros para que receitas − despesas seja
 * exatamente o resultado exibido, sem resíduos de ponto flutuante.
 */
export interface FinancialPeriod {
  /** 0–11, como em `Date#getMonth`. */
  month: number;
  year: number;
}

export interface FinancialSummary {
  /** Soma dos valores positivos, em reais. */
  income: number;
  /** Soma dos valores negativos em módulo, em reais. */
  expenses: number;
  /** `income - expenses`, em reais. */
  balance: number;
}

export interface TagTotal {
  tagId: number;
  name: string;
  color: string;
  /** Despesas da tag em módulo, em reais. */
  amount: number;
  /** Participação inteira no total de despesas do recorte (0–100). */
  percent: number;
}

export interface WeekFlow {
  label: string;
  income: number;
  expenses: number;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function summarize(entries: EntryDTO[]): FinancialSummary {
  let incomeCents = 0;
  let expensesCents = 0;

  for (const entry of entries) {
    const cents = toCents(entry.amount);
    if (cents > 0) {
      incomeCents += cents;
    } else if (cents < 0) {
      expensesCents += -cents;
    }
  }

  return {
    income: incomeCents / 100,
    expenses: expensesCents / 100,
    balance: (incomeCents - expensesCents) / 100,
  };
}

/** Prefixo `yyyy-MM` de `entryDate` (LocalDate do backend, sem fuso). */
function monthPrefix(period: FinancialPeriod): string {
  return `${period.year}-${String(period.month + 1).padStart(2, "0")}`;
}

/** Primeiro e último dia do mês, em `yyyy-MM-dd`. */
export function monthRange(period: FinancialPeriod): { start: string; end: string } {
  const lastDay = new Date(period.year, period.month + 1, 0).getDate();
  const prefix = monthPrefix(period);
  return { start: `${prefix}-01`, end: `${prefix}-${String(lastDay).padStart(2, "0")}` };
}

/** Entradas do mês selecionado, sem parse de data (evita deslocamento de fuso). */
export function entriesInMonth(
  entries: EntryDTO[],
  period: FinancialPeriod
): EntryDTO[] {
  const prefix = monthPrefix(period);
  return entries.filter((entry) => entry.entryDate.startsWith(prefix));
}

/** Resumo do mês selecionado. */
export function summarizeMonth(
  entries: EntryDTO[],
  period: FinancialPeriod
): FinancialSummary {
  return summarize(entriesInMonth(entries, period));
}

/** Saldo disponível: tudo o que foi lançado até o fim do mês selecionado. */
export function summarizeThrough(
  entries: EntryDTO[],
  period: FinancialPeriod
): FinancialSummary {
  const prefix = monthPrefix(period);
  return summarize(entries.filter((entry) => entry.entryDate.slice(0, 7) <= prefix));
}

/**
 * Despesas por tag, da maior para a menor. Receitas não entram: o recorte
 * responde "para onde foi o dinheiro".
 */
export function byTag(entries: EntryDTO[], tags: TagDTO[]): TagTotal[] {
  const centsByTag = new Map<number, number>();
  let totalCents = 0;

  for (const entry of entries) {
    const cents = toCents(entry.amount);
    if (cents >= 0) continue;
    centsByTag.set(entry.tagId, (centsByTag.get(entry.tagId) ?? 0) - cents);
    totalCents -= cents;
  }

  return tags
    .filter((tag) => tag.id !== undefined && (centsByTag.get(tag.id) ?? 0) > 0)
    .map((tag) => {
      const cents = centsByTag.get(tag.id!)!;
      return {
        tagId: tag.id!,
        name: tag.name,
        color: tag.color,
        amount: cents / 100,
        percent: Math.round((100 * cents) / totalCents),
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "pt-BR"));
}

const WEEK_LABELS = ["1–7", "8–14", "15–21", "22–fim"];

/** Receitas e despesas do mês em quatro faixas de dias; o dia 29+ entra na última. */
export function weeklyFlow(monthEntries: EntryDTO[]): WeekFlow[] {
  const weeks = WEEK_LABELS.map(() => ({ income: 0, expenses: 0 }));

  for (const entry of monthEntries) {
    const cents = toCents(entry.amount);
    const day = Number(entry.entryDate.slice(8, 10));
    const week = weeks[Math.min(3, Math.floor((day - 1) / 7))];
    if (cents > 0) week.income += cents;
    else if (cents < 0) week.expenses -= cents;
  }

  return weeks.map((week, index) => ({
    label: WEEK_LABELS[index],
    income: week.income / 100,
    expenses: week.expenses / 100,
  }));
}
