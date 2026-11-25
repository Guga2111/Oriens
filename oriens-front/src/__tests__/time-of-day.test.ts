import { describe, expect, it } from 'vitest';
import { HALF_HOURS, HOURS, MINUTES, nextHalfHour, parseTimeOfDay } from '@/lib/time-of-day';

describe('parseTimeOfDay', () => {
  it.each([
    ['9', '09:00'], ['14', '14:00'], ['9h', '09:00'], ['9h30', '09:30'], ['9h30min', '09:30'], ['930', '09:30'],
    ['0930', '09:30'], ['1430', '14:30'], ['09:30', '09:30'], ['9:', '09:00'], ['21.15', '21:15'], [' 7 h 05 ', '07:05'],
    ['0', '00:00'], ['23:59', '23:59'], ['Meio-dia', '12:00'], ['meia-noite', '00:00'],
  ])('lê %j como %s', (typed, time) => expect(parseTimeOfDay(typed)).toBe(time));

  it.each(['', '24', '2400', '9:3', '9:75', '12345', 'abc', '9 pm', ':30', '9h3'])('recusa %j', typed =>
    expect(parseTimeOfDay(typed)).toBeNull());
});

describe('nextHalfHour', () => {
  it('arredonda para a próxima meia hora e mantém o dia', () => {
    expect(nextHalfHour('09:00:00')).toBe('09:00');
    expect(nextHalfHour('09:01:00')).toBe('09:30');
    expect(nextHalfHour('09:31')).toBe('10:00');
    expect(nextHalfHour('23:45:00')).toBe('23:30');
  });

  it('lista as 48 meias horas do dia e as colunas de hora e minuto', () => {
    expect(HALF_HOURS).toHaveLength(48);
    expect(HALF_HOURS.at(0)).toBe('00:00');
    expect(HALF_HOURS.at(-1)).toBe('23:30');
    expect([HOURS.length, HOURS[0], HOURS.at(-1)]).toEqual([24, '00', '23']);
    expect([MINUTES.length, MINUTES[0], MINUTES.at(-1)]).toEqual([60, '00', '59']);
  });
});
