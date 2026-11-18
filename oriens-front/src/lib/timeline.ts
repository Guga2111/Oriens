import { addDays, addMonths, addWeeks, differenceInCalendarDays, format, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { productDate } from '@/lib/product-time';
import type { WorkObjective, WorkTask } from '@/types/work';

/** Pure rules of the project timeline (docs/plans/2026-11-18-project-timeline-design.md §5). */

export type TimelineScale = 'week' | 'fortnight' | 'month';

export const TIMELINE_SCALES: readonly { value: TimelineScale; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'fortnight', label: '2 semanas' },
  { value: 'month', label: 'Mês' },
];

/** Window around the anchor, in weeks (Monday-based) or months (from the 1st). Arrows step half of it. */
const SPANS = {
  week: { unit: 'week', before: 2, after: 6 },
  fortnight: { unit: 'week', before: 4, after: 12 },
  month: { unit: 'month', before: 2, after: 6 },
} as const satisfies Record<TimelineScale, { unit: 'week' | 'month'; before: number; after: number }>;

/** Shortest bar, in days, whose title fits inside it (about 6rem at each scale's day width). */
export const TITLE_INSIDE_DAYS: Record<TimelineScale, number> = { week: 2, fortnight: 3, month: 8 };

export interface TimelineWindow { startDate: string; endDate: string; days: number }
export interface TimelineDay { date: string; day: string; initial: string; weekend: boolean }
export interface TimelineSegment { key: string; label: string; column: number; span: number }
/** `column` is the 1-based day of the window; the bar covers `span` days. */
export interface Placement { column: number; span: number; clippedStart: boolean; clippedEnd: boolean }
export type TaskSpan = { kind: 'bar' | 'milestone' | 'inverted'; lo: string; hi: string };
export interface TimelineRow { task: WorkTask; span: TaskSpan; placement: Placement }
export interface TimelineGroupData { key: string; objective: WorkObjective | null; rows: TimelineRow[]; summary: Placement | null }
export interface TimelineLayout { groups: TimelineGroupData[]; undated: WorkTask[]; cancelled: number }

const toDay = (date: Date) => format(date, 'yyyy-MM-dd');
const shift = (unit: 'week' | 'month', date: Date, amount: number) => (unit === 'week' ? addWeeks : addMonths)(date, amount);

export function parseTimelineScale(value: string | null): TimelineScale {
  return TIMELINE_SCALES.some(scale => scale.value === value) ? value as TimelineScale : 'fortnight';
}

/** A missing or invalid `?anchor` (malformed or impossible like 2026-02-31) falls back to today. */
export function parseTimelineAnchor(value: string | null, today: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return today;
  return toDay(productDate(value)) === value ? value : today;
}

export function timelineWindow(scale: TimelineScale, anchor: string): TimelineWindow {
  const { unit, before, after } = SPANS[scale];
  const day = productDate(anchor);
  const base = unit === 'week' ? startOfWeek(day, { weekStartsOn: 1 }) : startOfMonth(day);
  const start = shift(unit, base, -before);
  const end = addDays(shift(unit, base, after), -1);
  return { startDate: toDay(start), endDate: toDay(end), days: differenceInCalendarDays(end, start) + 1 };
}

export function shiftTimelineAnchor(scale: TimelineScale, anchor: string, direction: -1 | 1): string {
  const { unit, before, after } = SPANS[scale];
  return toDay(shift(unit, productDate(anchor), direction * (before + after) / 2));
}

/** 0-based day of `date` in the window; negative or ≥ days when outside. */
export function dayIndex(window: TimelineWindow, date: string): number {
  return differenceInCalendarDays(productDate(date), productDate(window.startDate));
}

export function timelineDays(window: TimelineWindow): TimelineDay[] {
  const start = productDate(window.startDate);
  return Array.from({ length: window.days }, (_, index) => {
    const date = addDays(start, index);
    return { date: toDay(date), day: format(date, 'd'), initial: format(date, 'EEEEE', { locale: ptBR }).toUpperCase(),
      weekend: date.getDay() === 0 || date.getDay() === 6 };
  });
}

function segments(window: TimelineWindow, keyOf: (date: Date) => string, labelOf: (first: Date) => string): TimelineSegment[] {
  const start = productDate(window.startDate);
  const result: TimelineSegment[] = [];
  for (let index = 0; index < window.days; index++) {
    const date = addDays(start, index);
    const key = keyOf(date);
    const last = result[result.length - 1];
    if (last?.key === key) last.span++;
    else result.push({ key, label: labelOf(date), column: index + 1, span: 1 });
  }
  return result;
}

/** Upper header level: each month in full, pt-BR. */
export const monthSegments = (window: TimelineWindow) =>
  segments(window, date => format(date, 'yyyy-MM'), date => format(date, 'MMMM yyyy', { locale: ptBR }));

/** Lower header level of the month scale: one label per Monday-based week ("17 nov"). */
export const weekSegments = (window: TimelineWindow) =>
  segments(window, date => toDay(startOfWeek(date, { weekStartsOn: 1 })), formatTimelineDate);

export function formatTimelineDate(value: string | Date): string {
  return format(typeof value === 'string' ? productDate(value) : value, 'd MMM', { locale: ptBR });
}

/** Bar from plannedDate to dueDate (§5.6). A single date is a one-day bar (planned) or a milestone (due). */
export function taskSpan(task: Pick<WorkTask, 'plannedDate' | 'dueDate'>): TaskSpan | null {
  const { plannedDate: planned, dueDate: due } = task;
  if (planned && due) return planned <= due ? { kind: 'bar', lo: planned, hi: due } : { kind: 'inverted', lo: due, hi: planned };
  if (planned) return { kind: 'bar', lo: planned, hi: planned };
  if (due) return { kind: 'milestone', lo: due, hi: due };
  return null;
}

/** Days `lo..hi` cut to the window; null when the range lies entirely outside it. */
export function placeRange(window: TimelineWindow, lo: string, hi: string): Placement | null {
  const from = dayIndex(window, lo);
  const to = dayIndex(window, hi);
  if (to < 0 || from >= window.days) return null;
  const first = Math.max(from, 0);
  const last = Math.min(to, window.days - 1);
  return { column: first + 1, span: last - first + 1, clippedStart: from < 0, clippedEnd: to >= window.days };
}

/** CSS grid-column for a placement; line 1 is the sticky label column. */
export const gridColumn = ({ column, span }: Pick<Placement, 'column' | 'span'>) => `${column + 1} / span ${span}`;

const byPosition = (a: WorkTask, b: WorkTask) =>
  (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.id - b.id;

/**
 * Rows by objective (§5.4): objectives by position, then "Sem objetivo" when it has rows. Tasks sorted
 * by their start, then board position. Cancelled tasks are only counted; undated ones go to "Sem data".
 */
export function layoutTimeline(tasks: WorkTask[], objectives: WorkObjective[], window: TimelineWindow): TimelineLayout {
  const known = new Set(objectives.map(objective => objective.id));
  const rows = new Map<number | null, TimelineRow[]>();
  const undated: WorkTask[] = [];
  let cancelled = 0;
  for (const task of tasks) {
    if (task.status === 'CANCELLED') { cancelled++; continue; }
    const span = taskSpan(task);
    if (!span) { undated.push(task); continue; }
    const placement = placeRange(window, span.lo, span.hi);
    if (!placement) continue;
    const key = task.objectiveId !== null && known.has(task.objectiveId) ? task.objectiveId : null;
    rows.set(key, [...(rows.get(key) ?? []), { task, span, placement }]);
  }
  const group = (key: string, objective: WorkObjective | null, items: TimelineRow[] = []): TimelineGroupData => {
    const sorted = [...items].sort((a, b) => a.span.lo.localeCompare(b.span.lo) || byPosition(a.task, b.task));
    const summary = sorted.length ? placeRange(window,
      sorted.reduce((lo, row) => row.span.lo < lo ? row.span.lo : lo, sorted[0].span.lo),
      sorted.reduce((hi, row) => row.span.hi > hi ? row.span.hi : hi, sorted[0].span.hi)) : null;
    return { key, objective, rows: sorted, summary };
  };
  const groups = [...objectives].sort((a, b) => a.position - b.position || a.id - b.id)
    .map(objective => group(`objective-${objective.id}`, objective, rows.get(objective.id)));
  if (rows.has(null)) groups.push(group('none', null, rows.get(null)));
  return { groups, undated: [...undated].sort(byPosition), cancelled };
}
