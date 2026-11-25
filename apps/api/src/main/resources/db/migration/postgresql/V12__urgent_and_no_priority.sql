-- Adds URGENT and NONE priorities; new tasks without a chosen priority start as NONE.
ALTER TABLE tasks DROP CONSTRAINT tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority::text = ANY (ARRAY['NONE','LOW','MEDIUM','HIGH','URGENT']::text[]));
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'NONE';
ALTER TABLE support_tickets DROP CONSTRAINT support_tickets_priority_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_priority_check
  CHECK (priority::text = ANY (ARRAY['NONE','LOW','MEDIUM','HIGH','URGENT']::text[]));
