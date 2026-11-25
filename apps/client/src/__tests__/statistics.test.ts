import { describe, expect, it } from 'vitest';
import { activityCells, calendarWeeks, intensity, intervalDays, moneyBins, moneyTicks, previousInterval, rate, rateChange, volumeBins } from '@/lib/statistics';
import { centsAmount, moneyCents } from '@/lib/money';
import { formatCurrency } from '@/lib/format';
import { productNow } from '@/lib/product-time';
import type { ActivityData, HabitsData } from '@/types/statistics';

describe('estatísticas — períodos, populações e precisão', () => {
  it('compara intervalos inclusivos de igual duração, inclusive viradas de mês/ano', () => {
    expect(previousInterval({ startDate: '2026-01-01', endDate: '2026-01-07' })).toEqual({ startDate: '2025-12-25', endDate: '2025-12-31' });
    expect(intervalDays({ startDate: '2024-02-28', endDate: '2024-03-01' })).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
    expect(productNow(new Date('2026-11-14T02:59:59Z')).date).toBe('2026-11-13');
    expect(productNow(new Date('2026-11-14T03:00:00Z')).date).toBe('2026-11-14');
  });
  it('não transforma ausência de população em taxa zero e usa pontos percentuais', () => {
    expect(rate(0, 0)).toBeNull(); expect(rate(0, 3)).toBe(0);
    expect(rateChange(3, 4, 1, 2)).toBe('+25 p.p. vs. período anterior');
    expect(rateChange(3, 4, 0, 0)).toBe('Sem base comparável');
  });
  it('diferencia fonte indisponível, cobertura desconhecida e zero registrado', () => {
    const range = { startDate: '2026-11-12', endDate: '2026-11-13' };
    const tasks = { coverageFrom: '2026-11-13', days: [{ date: '2026-11-12', completed: 2 }, { date: '2026-11-13', completed: 0 }] } as ActivityData;
    const habits = { coverageFrom: '2026-11-13', days: [{ date: '2026-11-13', completed: 0 }] } as HabitsData;
    const cells = activityCells(range, '2026-11-13', tasks, habits);
    expect(cells[0]).toMatchObject({ total: 2, covered: false, partial: true });
    expect(cells[1]).toMatchObject({ total: 0, covered: true, partial: false });
    expect(activityCells(range, '2026-11-13', tasks)[0]).toMatchObject({ tasks: 2, habits: null, covered: false });
    expect([0, 1, 2, 3, 4, 6, 7, 90].map(intensity)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
  it('calendário mantém semanas segunda-domingo e cada dia do intervalo uma única vez', () => {
    const range = { startDate: '2026-11-01', endDate: '2026-11-15' }, weeks = calendarWeeks(range);
    expect(weeks[0][0]).toBe('2026-10-26'); expect(weeks[0][6]).toBe('2026-11-01');
    const within = weeks.flat().filter(d => d >= range.startDate && d <= range.endDate);
    expect(new Set(within).size).toBe(15); expect(within).toEqual(intervalDays(range));
  });
  it('agrega bins semanais respeitando as bordas e reconciliando conclusões', () => {
    const range = { startDate: '2026-10-30', endDate: '2026-12-01' };
    const values = [{ date: '2026-10-30', completed: 2 }, { date: '2026-11-01', completed: 3 }, { date: '2026-12-01', completed: 4 }];
    const bins = volumeBins(range, values);
    expect(bins[0]).toMatchObject({ date: '2026-10-30', end: '2026-11-01', completed: 5 });
    expect(bins[bins.length - 1].end).toBe('2026-12-01'); expect(bins.reduce((sum, b) => sum + b.completed, 0)).toBe(9);
  });
  it('soma centavos exatamente e mantém precisão mesmo além do inteiro seguro do JS', () => {
    const range = { startDate: '2026-11-01', endDate: '2026-11-03' };
    const bins = moneyBins(range, [{ date: range.startDate, income: '0.10', expenses: '0.01' }, { date: range.endDate, income: '0.20', expenses: '0.02' }]);
    expect(centsAmount(bins.reduce((sum, b) => sum + moneyCents(b.incomeExact), 0n))).toBe('0.30');
    expect(moneyCents('9999999999999999.99')).toBe(999999999999999999n);
    expect(formatCurrency('9999999999999999.99')).toContain('9.999.999.999.999.999,99');
    expect(formatCurrency('-0.01')).toContain('0,01'); expect(formatCurrency('-0.01')).toContain('−');
    expect(() => moneyCents('0.001')).toThrow();
  });
  it('mantém escala monetária legível para uma despesa de um centavo', () => {
    expect(moneyTicks(0.01)).toEqual([0, 0.01, 0.02]);
    expect(moneyTicks(0)).toEqual([0, 1, 2, 3, 4]);
    const ticks = moneyTicks(1234.56);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(1234.56);
    expect(ticks.every(value => Number.isInteger(value * 100))).toBe(true);
  });
});
