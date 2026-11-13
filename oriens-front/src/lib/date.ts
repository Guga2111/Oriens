import { format } from "date-fns";

/**
 * Interpreta `yyyy-MM-dd` (ou um ISO com hora) como data LOCAL, sem
 * `toISOString`. Um ISO `2026-11-15T00:00:00.000Z` continua sendo 15/11 em
 * qualquer fuso, porque só a parte de data é usada (SPEC §16).
 */
export function parseLocalDate(
  value?: string | Date | null
): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  const [year, month, day] = value
    .split("T")[0]
    .split("-")
    .map(Number);

  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Data curta de vencimento: `15/11`. */
export function formatDue(
  value?: string | Date | null
): string | undefined {
  const date = parseLocalDate(value);
  return date ? format(date, "dd/MM") : undefined;
}

/** Distância em dias inteiros entre hoje e a data (pode ser negativa). */
export function daysUntil(value: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(value);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** "hoje", "amanhã" ou "em N dias". */
export function formatDueDistance(value: Date): string {
  const days = daysUntil(value);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}
