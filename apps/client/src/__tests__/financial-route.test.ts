import { describe, expect, it } from 'vitest';
import {
  activeEntriesFilterCount, entriesDateRange, entriesFiltersFrom, entriesPath, entriesRangeFrom, entriesSearchParams,
  NO_ENTRIES_FILTERS, periodFromParam, periodParam,
} from '@/lib/financial-route';

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

  it('abre o recorte da Visão geral como período personalizado, categoria e busca', () => {
    const filters = entriesFiltersFrom(new URLSearchParams('start=2026-10-01&end=2026-10-31&tag=4&q=%20mercado%20'));
    expect(filters).toEqual({ period: 'custom', start: '2026-10-01', end: '2026-10-31', tagId: 4, search: 'mercado' });
    expect(activeEntriesFilterCount(filters)).toBe(3);
    expect(entriesSearchParams(filters).toString()).toBe('start=2026-10-01&end=2026-10-31&tag=4&q=mercado');
    expect(entriesFiltersFrom(new URLSearchParams())).toEqual(NO_ENTRIES_FILTERS);
  });

  it('mantém períodos relativos e intervalos incompletos fora da URL e da consulta', () => {
    const relative = { ...NO_ENTRIES_FILTERS, period: '7days' as const };
    expect(entriesSearchParams(relative).toString()).toBe('');
    expect(entriesDateRange(relative, '2026-11-25')).toEqual({ start: '2026-11-18', end: '2026-11-25' });
    expect(entriesDateRange({ ...NO_ENTRIES_FILTERS, period: 'thisMonth' }, '2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' });

    const incomplete = { ...NO_ENTRIES_FILTERS, period: 'custom' as const, start: '2026-11-10' };
    expect(entriesDateRange(incomplete, '2026-11-25')).toBeNull();
    expect(entriesSearchParams(incomplete).toString()).toBe('');
    expect(entriesDateRange({ ...incomplete, end: '2026-11-01' }, '2026-11-25')).toBeNull();
    expect(entriesDateRange(NO_ENTRIES_FILTERS, '2026-11-25')).toBeNull();
  });
});
