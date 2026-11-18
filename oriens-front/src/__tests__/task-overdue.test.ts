import { describe, expect, it } from 'vitest';
import { isTaskOverdue } from '@/lib/tasks';

const today = '2026-11-17';

describe('isTaskOverdue', () => {
  it('flags open tasks whose deadline is before today', () => {
    expect(isTaskOverdue({ dueDate: '2026-11-16', status: 'PENDING' }, today)).toBe(true);
    expect(isTaskOverdue({ dueDate: '2026-11-01', status: 'ON_DOING' }, today)).toBe(true);
  });

  it('does not flag a deadline today, in the future or missing', () => {
    expect(isTaskOverdue({ dueDate: today, status: 'PENDING' }, today)).toBe(false);
    expect(isTaskOverdue({ dueDate: '2026-11-18', status: 'PENDING' }, today)).toBe(false);
    expect(isTaskOverdue({ dueDate: null, status: 'PENDING' }, today)).toBe(false);
  });

  it('does not flag finished tasks', () => {
    expect(isTaskOverdue({ dueDate: '2026-11-16', status: 'CONCLUDED' }, today)).toBe(false);
    expect(isTaskOverdue({ dueDate: '2026-11-16', status: 'CANCELLED' }, today)).toBe(false);
  });
});
