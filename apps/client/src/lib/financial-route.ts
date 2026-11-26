import { format, subDays } from 'date-fns';
import { validCalendarDate } from '@/lib/work-form';
import { productDate } from '@/lib/product-time';
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

export type EntriesPeriod = 'all' | '7days' | '15days' | '30days' | 'thisMonth' | 'custom';

/** The entries page's filters; dates are product calendar days (`yyyy-MM-dd`), empty while unset. */
export interface EntriesFilters {
  period: EntriesPeriod;
  start: string;
  end: string;
  tagId: number | null;
  search: string;
}

export const NO_ENTRIES_FILTERS: EntriesFilters = { period: 'all', start: '', end: '', tagId: null, search: '' };

/** A month or category opened from the overview arrives as `?start&end&tag`; the search travels as `q`. */
export function entriesFiltersFrom(params: URLSearchParams): EntriesFilters {
  const range = entriesRangeFrom(params);
  return {
    ...NO_ENTRIES_FILTERS,
    ...(range.start && range.end ? { period: 'custom' as const, start: range.start, end: range.end } : {}),
    tagId: range.tagId,
    search: params.get('q')?.trim() ?? '',
  };
}

/** The shareable part of the filters; relative periods depend on the day and stay out of the URL. */
export function entriesSearchParams(filters: EntriesFilters): URLSearchParams {
  const params = new URLSearchParams();
  const range = customRange(filters);
  if (range) { params.set('start', range.start); params.set('end', range.end); }
  if (filters.tagId !== null) params.set('tag', String(filters.tagId));
  if (filters.search) params.set('q', filters.search);
  return params;
}

/** An incomplete or inverted custom range does not restrict the dates until both days are valid. */
function customRange(filters: EntriesFilters): { start: string; end: string } | null {
  if (filters.period !== 'custom' || !filters.start || !filters.end || filters.start > filters.end) return null;
  return { start: filters.start, end: filters.end };
}

export function entriesDateRange(filters: EntriesFilters, today: string): { start: string; end: string } | null {
  const day = productDate(today);
  const daysAgo = (days: number) => ({ start: format(subDays(day, days), 'yyyy-MM-dd'), end: today });
  switch (filters.period) {
    case '7days': return daysAgo(7);
    case '15days': return daysAgo(15);
    case '30days': return daysAgo(30);
    case 'thisMonth': return monthRange(periodFromParam(null, today));
    case 'custom': return customRange(filters);
    default: return null;
  }
}

export function activeEntriesFilterCount(filters: EntriesFilters): number {
  return Number(filters.period !== 'all') + Number(filters.tagId !== null) + Number(filters.search !== '');
}
