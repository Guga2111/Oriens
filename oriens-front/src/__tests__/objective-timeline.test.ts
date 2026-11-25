import { expect, it } from 'vitest';
import { formatDuration, lowerSegments, objectiveSpan, objectiveWindow, parseObjectiveScale, upperSegments } from '@/lib/objective-timeline';
import { objectiveProgressParts, pinnedFirst } from '@/lib/objectives';
import { objective } from './work-fixtures';

it('mede a duração em dias inclusivos e trata datas isoladas', () => {
  expect(objectiveSpan({ startDate: '2026-11-23', dueDate: '2026-12-07' })).toEqual({ lo: '2026-11-23', hi: '2026-12-07', days: 15 });
  expect(objectiveSpan({ startDate: '2026-11-23', dueDate: null })).toEqual({ lo: '2026-11-23', hi: '2026-11-23', days: 1 });
  expect(objectiveSpan({ startDate: null, dueDate: '2026-12-07' })?.days).toBe(1);
  expect(objectiveSpan({ startDate: null, dueDate: null })).toBeNull();
  expect(formatDuration(objectiveSpan({ startDate: '2026-11-23', dueDate: '2026-12-07' }))).toBe('15 dias');
  expect(formatDuration(objectiveSpan({ startDate: '2026-11-23', dueDate: null }))).toBe('1 dia');
  expect(formatDuration(null)).toBe('—');
});

it('cobre hoje e todos os objetivos com folga na unidade da escala', () => {
  expect(objectiveWindow('week', '2026-11-24', [])).toEqual({ startDate: '2026-11-09', endDate: '2027-01-03', days: 56 });
  const far = objectiveWindow('week', '2026-11-24', [{ startDate: '2026-10-01', dueDate: '2027-01-10' }]);
  expect(far.startDate).toBe('2026-09-14');
  expect(far.endDate).toBe('2027-02-14');
  expect(objectiveWindow('quarter', '2026-11-24', []).startDate).toBe('2026-08-01');
  // A distant date never grows the grid past three years.
  const capped = objectiveWindow('week', '2026-11-24', [{ startDate: '2010-01-01', dueDate: null }]);
  expect(capped.days).toBe(3 * 366);
  // The cut keeps today inside the grid.
  expect(capped.startDate <= '2026-11-24' && capped.endDate >= '2026-11-24').toBe(true);
  const ahead = objectiveWindow('week', '2026-11-24', [{ startDate: null, dueDate: '2040-01-01' }]);
  expect(ahead.startDate).toBe('2026-11-09');
});

it('rotula semanas ISO, dias e trimestres em pt-BR', () => {
  const period = objectiveWindow('week', '2026-11-24', []);
  const week = upperSegments('week', period).find(segment => segment.key === '2026-11-23');
  expect(week).toMatchObject({ label: 'nov 2026', aside: 'Semana 48', span: 7 });
  expect(upperSegments('week', period).find(segment => segment.key === '2026-11-30')?.label).toBe('nov 2026 – dez 2026');
  expect(lowerSegments('week', period).find(segment => segment.key === '2026-11-24')).toMatchObject({ label: 'T', aside: '24' });
  const quarter = objectiveWindow('quarter', '2026-11-24', []);
  expect(upperSegments('quarter', quarter).map(segment => segment.label)).toContain('4º trimestre 2026');
  expect(lowerSegments('quarter', quarter).map(segment => segment.label)).toContain('novembro');
  expect(parseObjectiveScale('fortnight')).toBe('week');
  expect(parseObjectiveScale('quarter')).toBe('quarter');
});

it('põe fixados primeiro sem mudar a ordem entre os demais', () => {
  const list = [{ ...objective, id: 1, position: 0 }, { ...objective, id: 2, position: 1, favorite: true }, { ...objective, id: 3, position: 2 }];
  expect(pinnedFirst(list).map(item => item.id)).toEqual([2, 1, 3]);
  expect(list.map(item => item.id)).toEqual([1, 2, 3]);
});

it('divide o progresso em concluídas, em andamento e restante sem passar do total', () => {
  const goal = { ...objective, nonCancelledTasks: 5, completedTasks: 2 };
  const tasks = [{ objectiveId: goal.id, status: 'ON_DOING' as const }, { objectiveId: 999, status: 'ON_DOING' as const }];
  expect(objectiveProgressParts(goal, tasks)).toEqual({ total: 5, done: 2, started: 1, rest: 2 });
  expect(objectiveProgressParts(goal)).toEqual({ total: 5, done: 2, started: 0, rest: 3 });
  expect(objectiveProgressParts({ ...goal, nonCancelledTasks: null, completedTasks: null })).toEqual({ total: 0, done: 0, started: 0, rest: 0 });
});
