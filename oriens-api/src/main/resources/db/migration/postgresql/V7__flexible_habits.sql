-- Flexible habits: a schedule may require N executions per ISO week (Monday–Sunday) on any day
-- instead of fixed weekdays. Additive: existing schedules keep weekly_target NULL and therefore
-- their fixed-weekday behaviour. A flexible schedule makes every weekday eligible (mask 127).
ALTER TABLE habit_schedules ADD COLUMN weekly_target smallint;
ALTER TABLE habit_schedules ADD CONSTRAINT ck_habit_schedule_weekly_target
  CHECK (weekly_target IS NULL OR (weekly_target BETWEEN 1 AND 7 AND weekdays = 127));
