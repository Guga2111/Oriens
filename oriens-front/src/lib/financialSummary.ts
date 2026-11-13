import type { EntryDTO, TagDTO } from "@/types/financial";

/**
 * Agregação financeira isolada (SPEC §11.5, D11). Quando o endpoint de resumo
 * (BE3) existir, só a origem dos dados muda: os componentes continuam lendo
 * estas funções.
 *
 * Os valores são somados em centavos inteiros para que receitas − gastos seja
 * exatamente o saldo exibido, sem resíduos de ponto flutuante.
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
  /** Gastos da tag em módulo, em reais. */
  amount: number;
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

/** Resumo de todo o histórico carregado (saldo acumulado). */
export function summarizeAll(entries: EntryDTO[]): FinancialSummary {
  return summarize(entries);
}

/**
 * Gastos por tag, do maior para o menor. Receitas não entram: o gráfico e o
 * anel respondem "para onde foi o dinheiro".
 */
export function byTag(entries: EntryDTO[], tags: TagDTO[]): TagTotal[] {
  const centsByTag = new Map<number, number>();

  for (const entry of entries) {
    const cents = toCents(entry.amount);
    if (cents >= 0) continue;
    centsByTag.set(entry.tagId, (centsByTag.get(entry.tagId) ?? 0) - cents);
  }

  return tags
    .filter((tag) => tag.id !== undefined && (centsByTag.get(tag.id) ?? 0) > 0)
    .map((tag) => ({
      tagId: tag.id!,
      name: tag.name,
      color: tag.color,
      amount: centsByTag.get(tag.id!)! / 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}
