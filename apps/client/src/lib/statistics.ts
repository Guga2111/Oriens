import { moneyCents, centsAmount } from './money';
import { addDays, differenceInCalendarDays, format, startOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { productDate } from './product-time';
import type { ActivityCell, ActivityData, HabitsData, Interval, MoneyDay } from '@/types/statistics';

export const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');
export const shortDate = (date: string) => format(productDate(date), 'dd/MM/yyyy', { locale: ptBR });
export const fullDate = (date: string) => format(productDate(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
export const intervalLabel = (period: Interval) => `${shortDate(period.startDate)} – ${shortDate(period.endDate)}`;
export function intervalDays(period: Interval) {
  const size = differenceInCalendarDays(productDate(period.endDate), productDate(period.startDate)) + 1;
  return size > 0 && size <= 366 ? Array.from({ length: size }, (_, i) => dateKey(addDays(productDate(period.startDate), i))) : [];
}
export function previousInterval(period: Interval): Interval {
  const days = intervalDays(period).length;
  return { startDate: dateKey(subDays(productDate(period.startDate), days)), endDate: dateKey(subDays(productDate(period.startDate), 1)) };
}
export const rate = (completed: number, expected: number) => expected > 0 ? completed / expected * 100 : null;
export const formatRate = (value: number | null) => value === null ? '—' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
export const countChange = (current: number, previous: number) => `${current - previous > 0 ? '+' : ''}${current - previous} vs. ${previous} no período anterior`;
export function rateChange(completed: number, expected: number, previousCompleted: number, previousExpected: number) {
  const current = rate(completed, expected), previous = rate(previousCompleted, previousExpected);
  if (current === null || previous === null) return 'Sem base comparável';
  const delta = current - previous;
  return `${delta > 0 ? '+' : ''}${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(delta)} p.p. vs. período anterior`;
}
export const intensity = (total: number) => total === 0 ? 0 : total === 1 ? 1 : total <= 3 ? 2 : total <= 6 ? 3 : 4;
export function activityCells(period: Interval, today: string, tasks?: ActivityData, habits?: HabitsData): ActivityCell[] {
  const ts = new Map(tasks?.days.map(day => [day.date, day.completed]) ?? []);
  const hs = new Map(habits?.days.map(day => [day.date, day.completed]) ?? []);
  return intervalDays(period).map(date => {
    const taskCount = tasks ? ts.get(date) ?? 0 : null, habitCount = habits ? hs.get(date) ?? 0 : null;
    const covered = !!tasks && !!habits && date >= tasks.coverageFrom && date >= habits.coverageFrom;
    return { date, tasks: taskCount, habits: habitCount, total: (taskCount ?? 0) + (habitCount ?? 0), covered,
      partial: !covered, future: date > today };
  });
}
export function calendarWeeks(period: Interval) {
  const start = startOfWeek(productDate(period.startDate), { weekStartsOn: 1 });
  const count = Math.ceil((differenceInCalendarDays(productDate(period.endDate), start) + 1) / 7);
  return Array.from({ length: count }, (_, w) => Array.from({ length: 7 }, (_, d) => dateKey(addDays(start, w * 7 + d))));
}
export function volumeBins(period: Interval, values: { date: string; completed: number }[]) {
  const weekly = intervalDays(period).length > 31;
  const source = new Map(values.map(v => [v.date, v.completed]));
  const bins = new Map<string, { date: string; end: string; completed: number }>();
  for (const date of intervalDays(period)) {
    const week = dateKey(startOfWeek(productDate(date), { weekStartsOn: 1 }));
    const key = weekly && week > period.startDate ? week : weekly ? period.startDate : date;
    const bin = bins.get(key) ?? { date: key, end: date, completed: 0 };
    bin.completed += source.get(date) ?? 0; bin.end = date; bins.set(key, bin);
  }
  return [...bins.values()];
}
export function moneyBins(period: Interval, values: MoneyDay[]) {
  const weekly = intervalDays(period).length > 31, source = new Map(values.map(v => [v.date, v]));
  const bins = new Map<string, { date: string; end: string; income: bigint; expenses: bigint }>();
  for (const date of intervalDays(period)) {
    const week = dateKey(startOfWeek(productDate(date), { weekStartsOn: 1 }));
    const key = weekly && week > period.startDate ? week : weekly ? period.startDate : date;
    const bin = bins.get(key) ?? { date: key, end: date, income: 0n, expenses: 0n };
    const row = source.get(date);
    bin.income += moneyCents(row?.income ?? '0'); bin.expenses += moneyCents(row?.expenses ?? '0'); bin.end = date; bins.set(key, bin);
  }
  return [...bins.values()].map(b => ({ ...b, income: Number(b.income) / 100, expenses: Number(b.expenses) / 100,
    incomeExact: centsAmount(b.income), expensesExact: centsAmount(b.expenses) }));
}

/** Money axes never divide a cent or print several distinct ticks as the same zero. */
export function moneyTicks(maximum: number): number[] {
  if (maximum <= 0) return [0, 1, 2, 3, 4];
  const maxCents = Math.round(maximum * 100), target = Math.max(1, maxCents / 4);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 5, 10].map(n => n * magnitude).find(n => n >= target)!;
  const count = Math.floor(maxCents / step) + 1;
  return Array.from({ length: count + 1 }, (_, i) => i * step / 100);
}
