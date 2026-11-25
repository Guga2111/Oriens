import { describe, expect, it } from 'vitest';
import { entriesPath, entriesRangeFrom, periodFromParam, periodParam } from '@/lib/financial-route';

describe('financial-route — estado do Financeiro na URL', () => {
  it('lê o mês da URL e cai no mês atual quando o valor é inválido', () => {
    expect(periodFromParam('2026-02', '2026-11-25')).toEqual({ year: 2026, month: 1 });
    expect(periodFromParam('2026-13', '2026-11-25')).toEqual({ year: 2026, month: 10 });
    expect(periodFromParam(null, '2026-11-25')).toEqual({ year: 2026, month: 10 });
    expect(periodParam({ year: 2027, month: 0 })).toBe('2027-01');
  });

  it('monta o caminho do histórico com mês completo e categoria opcional', () => {
    expect(entriesPath({ year: 2028, month: 1 }, 4)).toBe('/financial/entries?start=2028-02-01&end=2028-02-29&tag=4');
    expect(entriesPath({ year: 2026, month: 10 })).toBe('/financial/entries?start=2026-11-01&end=2026-11-30');
  });

  it('descarta intervalo inválido, incompleto ou invertido e tag não positiva', () => {
    expect(entriesRangeFrom(new URLSearchParams('start=2026-11-01&end=2026-11-30&tag=2'))).toEqual({ start: '2026-11-01', end: '2026-11-30', tagId: 2 });
    expect(entriesRangeFrom(new URLSearchParams('start=2026-02-30&end=2026-03-01&tag=0'))).toEqual({ start: null, end: null, tagId: null });
    expect(entriesRangeFrom(new URLSearchParams('start=2026-11-30&end=2026-11-01&tag=x'))).toEqual({ start: null, end: null, tagId: null });
    expect(entriesRangeFrom(new URLSearchParams('start=2026-11-01'))).toEqual({ start: null, end: null, tagId: null });
  });
});
