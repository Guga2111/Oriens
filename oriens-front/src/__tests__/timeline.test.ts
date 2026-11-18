import { describe, expect, it } from 'vitest';
import {
  layoutTimeline, monthSegments, parseTimelineAnchor, parseTimelineScale, placeRange, shiftTimelineAnchor, taskSpan,
  timelineDays, timelineWindow, weekSegments,
} from '@/lib/timeline';
import { objective, task } from './work-fixtures';
import type { WorkTask } from '@/types/work';

const anchor = '2026-11-18'; // Wednesday; its week starts on Monday 16/11.
const make = (id: number, fields: Partial<WorkTask>): WorkTask => ({ ...task, id, ...fields });

describe('timeline window', () => {
  it('spans each scale around the anchor, with Monday weeks and month starts', () => {
    expect(timelineWindow('week', anchor)).toEqual({ startDate: '2026-11-02', endDate: '2026-12-27', days: 56 });
    expect(timelineWindow('fortnight', anchor)).toEqual({ startDate: '2026-10-19', endDate: '2027-02-07', days: 112 });
    expect(timelineWindow('month', anchor)).toEqual({ startDate: '2026-09-01', endDate: '2027-04-30', days: 242 });
  });

  it('steps half of the window: 4 weeks, 8 weeks and 4 months', () => {
    expect(shiftTimelineAnchor('week', anchor, -1)).toBe('2026-10-21');
    expect(shiftTimelineAnchor('fortnight', anchor, 1)).toBe('2027-01-13');
    expect(shiftTimelineAnchor('month', anchor, 1)).toBe('2027-03-18');
  });

  it('ignores an invalid anchor or scale', () => {
    expect(parseTimelineAnchor(null, anchor)).toBe(anchor);
    expect(parseTimelineAnchor('amanhã', anchor)).toBe(anchor);
    expect(parseTimelineAnchor('2026-02-31', anchor)).toBe(anchor);
    expect(parseTimelineAnchor('2026-12-01', anchor)).toBe('2026-12-01');
    expect(parseTimelineScale('year')).toBe('fortnight');
    expect(parseTimelineScale('month')).toBe('month');
  });

  it('labels days, weekends, months and weeks in pt-BR', () => {
    const period = timelineWindow('week', anchor);
    const days = timelineDays(period);
    expect(days[0]).toEqual({ date: '2026-11-02', day: '2', initial: 'S', weekend: false });
    expect(days[5].weekend && days[6].weekend).toBe(true);
    expect(monthSegments(period).map(m => [m.label, m.column, m.span])).toEqual([['novembro 2026', 1, 29], ['dezembro 2026', 30, 27]]);
    const month = timelineWindow('month', anchor);
    expect(weekSegments(month).slice(0, 2).map(w => [w.label, w.column, w.span])).toEqual([['1 set', 1, 6], ['7 set', 7, 7]]);
  });
});

describe('task span (§5.6)', () => {
  it('maps each date case', () => {
    expect(taskSpan({ plannedDate: '2026-11-19', dueDate: '2026-11-20' })).toEqual({ kind: 'bar', lo: '2026-11-19', hi: '2026-11-20' });
    expect(taskSpan({ plannedDate: '2026-11-19', dueDate: null })).toEqual({ kind: 'bar', lo: '2026-11-19', hi: '2026-11-19' });
    expect(taskSpan({ plannedDate: null, dueDate: '2026-11-20' })).toEqual({ kind: 'milestone', lo: '2026-11-20', hi: '2026-11-20' });
    expect(taskSpan({ plannedDate: '2026-11-22', dueDate: '2026-11-20' })).toEqual({ kind: 'inverted', lo: '2026-11-20', hi: '2026-11-22' });
    expect(taskSpan({ plannedDate: null, dueDate: null })).toBeNull();
  });

  it('clips ranges at the window edges and drops ranges outside it', () => {
    const period = timelineWindow('week', anchor); // 2026-11-02 .. 2026-12-27
    expect(placeRange(period, '2026-11-03', '2026-11-04')).toEqual({ column: 2, span: 2, clippedStart: false, clippedEnd: false });
    expect(placeRange(period, '2026-10-20', '2026-11-03')).toEqual({ column: 1, span: 2, clippedStart: true, clippedEnd: false });
    expect(placeRange(period, '2026-12-26', '2027-01-10')).toEqual({ column: 55, span: 2, clippedStart: false, clippedEnd: true });
    expect(placeRange(period, '2026-10-01', '2026-11-01')).toBeNull();
    expect(placeRange(period, '2026-12-28', '2026-12-30')).toBeNull();
  });
});

describe('layoutTimeline (§5.4)', () => {
  const period = timelineWindow('week', anchor);
  const second = { ...objective, id: 82, title: 'Segundo', position: 1 };
  const first = { ...objective, id: 81, title: 'Primeiro', position: 0 };

  it('groups by objective position, "Sem objetivo" last, rows by start then position', () => {
    const layout = layoutTimeline([
      make(1, { objectiveId: 82, plannedDate: '2026-11-20', position: 0 }),
      make(2, { objectiveId: 81, plannedDate: '2026-11-25', position: 0 }),
      make(3, { objectiveId: 81, plannedDate: '2026-11-19', dueDate: '2026-11-30', position: 5 }),
      make(4, { objectiveId: 81, plannedDate: '2026-11-19', position: 1 }),
      make(5, { objectiveId: null, dueDate: '2026-11-21' }),
    ], [second, first], period);
    expect(layout.groups.map(g => g.key)).toEqual(['objective-81', 'objective-82', 'none']);
    expect(layout.groups[0].rows.map(r => r.task.id)).toEqual([4, 3, 2]);
    expect(layout.groups[0].summary).toEqual({ column: 18, span: 12, clippedStart: false, clippedEnd: false });
    expect(layout.groups[2].rows[0].span.kind).toBe('milestone');
  });

  it('hides cancelled tasks, keeps undated apart and keeps objectives without rows', () => {
    const layout = layoutTimeline([
      make(1, { objectiveId: 81, status: 'CANCELLED', plannedDate: '2026-11-20' }),
      make(2, { objectiveId: 81, status: 'CANCELLED' }),
      make(3, { objectiveId: 81 }),
      make(4, { objectiveId: 81, plannedDate: '2027-03-01' }),
    ], [first], period);
    expect(layout.cancelled).toBe(2);
    expect(layout.undated.map(t => t.id)).toEqual([3]);
    expect(layout.groups).toHaveLength(1);
    expect(layout.groups[0]).toMatchObject({ rows: [], summary: null });
  });
});
