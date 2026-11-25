import { validCalendarDate } from '@/lib/work-form';
import { monthRange, type FinancialPeriod } from '@/lib/financialSummary';

/** URL state of the Financeiro pages: `?month=yyyy-MM` on the overview, `?start&end&tag` on the entries. */
export const ENTRIES_PATH = '/financial/entries';

export function periodParam(period: FinancialPeriod): string {
  return `${period.year}-${String(period.month + 1).padStart(2, '0')}`;
}

/** A malformed or missing month falls back to the product's current month. */
export function periodFromParam(value: string | null, today: string): FinancialPeriod {
  const month = value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : today.slice(0, 7);
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) - 1 };
}

export function entriesPath(period: FinancialPeriod, tagId?: number): string {
  const { start, end } = monthRange(period);
  const params = new URLSearchParams({ start, end });
  if (tagId !== undefined) params.set('tag', String(tagId));
  return `${ENTRIES_PATH}?${params}`;
}

export interface EntriesRange {
  start: string | null;
  end: string | null;
  tagId: number | null;
}

/** Invalid values are dropped instead of reaching the API; an incomplete range is ignored. */
export function entriesRangeFrom(params: URLSearchParams): EntriesRange {
  const start = params.get('start'), end = params.get('end'), tag = Number(params.get('tag'));
  const validRange = !!start && !!end && validCalendarDate(start) && validCalendarDate(end) && start <= end;
  return {
    start: validRange ? start : null,
    end: validRange ? end : null,
    tagId: Number.isSafeInteger(tag) && tag > 0 ? tag : null,
  };
}
