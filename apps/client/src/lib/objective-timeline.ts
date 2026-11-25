import { addDays, addMonths, addWeeks, differenceInCalendarDays, endOfWeek, format, getISOWeek, getQuarter, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { productDate } from '@/lib/product-time';
import { monthSegments, timelineSegments, weekSegments, type TimelineSegment, type TimelineWindow } from '@/lib/timeline';
import type { WorkObjective } from '@/types/work';

/** Pure rules of the objectives timeline (docs/plans/2026-11-24-objectives-views-design.md). */

export type ObjectiveScale = 'week' | 'month' | 'quarter';

export const OBJECTIVE_SCALES: readonly { value: ObjectiveScale; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'quarter', label: 'Trimestre' },
];

export const parseObjectiveScale = (value: string | null): ObjectiveScale =>
  OBJECTIVE_SCALES.some(scale => scale.value === value) ? value as ObjectiveScale : 'week';

/** Room before and after today and the objectives, in each scale's unit, so the grid always scrolls past them. */
const PADDING = {
  week: { unit: 'week', before: 2, after: 6 },
  month: { unit: 'month', before: 1, after: 3 },
  quarter: { unit: 'month', before: 3, after: 9 },
} as const satisfies Record<ObjectiveScale, { unit: 'week' | 'month'; before: number; after: number }>;

/** A far-off date never grows the grid beyond three years of columns. */
const MAX_DAYS = 3 * 366;

/** Shortest bar, in days, that keeps its title inside (about 9rem at each scale's day width); shorter ones show it after. */
export const TITLE_INSIDE_DAYS: Record<ObjectiveScale, number> = { week: 3, month: 12, quarter: 40 };

export interface ObjectiveSpan { lo: string; hi: string; days: number }

/** Start to end, both inclusive. A single date is a one-day span; no date, no span. */
export function objectiveSpan(objective: Pick<WorkObjective, 'startDate' | 'dueDate'>): ObjectiveSpan | null {
  const lo = objective.startDate ?? objective.dueDate;
  const hi = objective.dueDate ?? objective.startDate;
  if (!lo || !hi) return null;
  return { lo, hi, days: differenceInCalendarDays(productDate(hi), productDate(lo)) + 1 };
}

export const formatDuration = (span: ObjectiveSpan | null) => !span ? '—' : span.days === 1 ? '1 dia' : `${span.days} dias`;

const toDay = (date: Date) => format(date, 'yyyy-MM-dd');

/**
 * Covers today and every dated objective, with the scale's padding on both sides. Past three years the grid is cut
 * around today, so a distant or mistyped date never pushes today out of it.
 */
export function objectiveWindow(scale: ObjectiveScale, today: string, objectives: Pick<WorkObjective, 'startDate' | 'dueDate'>[]): TimelineWindow {
  let lo = today, hi = today;
  for (const span of objectives.map(objectiveSpan)) {
    if (!span) continue;
    if (span.lo < lo) lo = span.lo;
    if (span.hi > hi) hi = span.hi;
  }
  const { unit, before, after } = PADDING[scale];
  const align = (value: string) => unit === 'week' ? startOfWeek(productDate(value), { weekStartsOn: 1 }) : startOfMonth(productDate(value));
  const shift = unit === 'week' ? addWeeks : addMonths;
  const start = shift(align(lo), -before);
  const end = addDays(shift(align(hi), after), -1);
  const total = differenceInCalendarDays(end, start) + 1;
  if (total <= MAX_DAYS) return { startDate: toDay(start), endDate: toDay(end), days: total };
  const fromToday = Math.min(Math.max(differenceInCalendarDays(productDate(today), start) - Math.floor(MAX_DAYS / 2), 0), total - MAX_DAYS);
  const capped = addDays(start, fromToday);
  return { startDate: toDay(capped), endDate: toDay(addDays(capped, MAX_DAYS - 1)), days: MAX_DAYS };
}

export interface HeaderSegment extends TimelineSegment { aside?: string }

const monthYear = (date: Date) => format(date, 'MMM yyyy', { locale: ptBR });

/** Upper header row: weeks ("nov 2026" + "Semana 47"), months, or quarters ("4º trimestre 2026"). */
export function upperSegments(scale: ObjectiveScale, window: TimelineWindow): HeaderSegment[] {
  if (scale === 'month') return monthSegments(window);
  if (scale === 'quarter') return timelineSegments(window, date => `${date.getFullYear()}-${getQuarter(date)}`,
    date => `${getQuarter(date)}º trimestre ${date.getFullYear()}`);
  return timelineSegments(window, date => toDay(startOfWeek(date, { weekStartsOn: 1 })), date => {
    const first = startOfWeek(date, { weekStartsOn: 1 });
    const last = endOfWeek(date, { weekStartsOn: 1 });
    return monthYear(first) === monthYear(last) ? monthYear(first) : `${monthYear(first)} – ${monthYear(last)}`;
  }).map(week => ({ ...week, aside: `Semana ${getISOWeek(productDate(week.key))}` }));
}

/** Lower header row, which is also where the grid draws its column lines: days, weeks or months. */
export function lowerSegments(scale: ObjectiveScale, window: TimelineWindow): HeaderSegment[] {
  if (scale === 'month') return weekSegments(window);
  if (scale === 'quarter') return timelineSegments(window, date => format(date, 'yyyy-MM'), date => format(date, 'MMMM', { locale: ptBR }));
  // One-letter weekday, as the task timeline shows it, so the day number still fits the 3rem column.
  return timelineSegments(window, toDay, date => format(date, 'EEEEE', { locale: ptBR }).toUpperCase())
    .map(day => ({ ...day, aside: format(productDate(day.key), 'd') }));
}
