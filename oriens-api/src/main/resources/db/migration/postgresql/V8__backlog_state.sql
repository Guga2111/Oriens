-- Backlog becomes a task state of its own, distinct from PENDING (To-Do), and development boards adopt the
-- industry's five columns: Backlog, To-Do, In Progress, Done and Cancelled. Tasks keep their column and state.

-- 1. Accept BACKLOG wherever a task state or a column kind is checked. The inline CHECKs of V1 have
--    generated names, so they are found by table, column and expression rather than guessed.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conrelid::regclass AS tbl, con.conname
    FROM pg_constraint con
    WHERE con.contype = 'c'
      AND con.conrelid IN ('tasks'::regclass, 'project_columns'::regclass)
      AND pg_get_constraintdef(con.oid) LIKE '%ON_DOING%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
  END LOOP;
END $$;
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_status
  CHECK (status::text = ANY (ARRAY['BACKLOG','PENDING','ON_DOING','CONCLUDED','CANCELLED']::text[]));
ALTER TABLE project_columns ADD CONSTRAINT ck_project_columns_kind
  CHECK (kind::text = ANY (ARRAY['BACKLOG','PENDING','ON_DOING','CONCLUDED','CANCELLED']::text[]));

-- Backlog work is open work: it can become overdue.
DROP INDEX IF EXISTS idx_statistics_overdue;
CREATE INDEX idx_statistics_overdue ON tasks(user_id,due_date) WHERE status IN ('BACKLOG','PENDING','ON_DOING');

-- 2. English names for the columns that still carry the old default names, when the new name is free.
UPDATE project_columns c SET name = r.new_name, version = c.version + 1
FROM (VALUES ('a fazer','To-Do'), ('fazendo','In Progress'), ('concluídas','Done')) AS r(old_name, new_name)
WHERE lower(btrim(c.name)) = r.old_name
  AND NOT EXISTS (SELECT 1 FROM project_columns o
                  WHERE o.project_id = c.project_id AND o.id <> c.id AND lower(btrim(o.name)) = lower(r.new_name));

-- 3. Every development board gets a Backlog first (the others move one place down), and a Cancelled column
--    last when it has none. A name already taken gets a suffix instead of failing the deployment.
CREATE TEMP TABLE backlog_board ON COMMIT DROP AS
SELECT p.id AS project_id FROM project p
WHERE p.mode = 'DEVELOPMENT'
  AND NOT EXISTS (SELECT 1 FROM project_columns c WHERE c.project_id = p.id AND c.kind = 'BACKLOG');

UPDATE project_columns c SET position = c.position + 1
WHERE c.project_id IN (SELECT project_id FROM backlog_board);

INSERT INTO project_columns (project_id, name, kind, position, version)
SELECT b.project_id,
       CASE WHEN EXISTS (SELECT 1 FROM project_columns o WHERE o.project_id = b.project_id AND lower(btrim(o.name)) = 'backlog')
            THEN 'Backlog (padrão)' ELSE 'Backlog' END,
       'BACKLOG', 0, 0
FROM backlog_board b;

INSERT INTO project_columns (project_id, name, kind, position, version)
SELECT p.id,
       CASE WHEN EXISTS (SELECT 1 FROM project_columns o WHERE o.project_id = p.id AND lower(btrim(o.name)) = 'cancelled')
            THEN 'Cancelled (padrão)' ELSE 'Cancelled' END,
       'CANCELLED',
       (SELECT coalesce(max(c.position), -1) + 1 FROM project_columns c WHERE c.project_id = p.id),
       0
FROM project p
WHERE p.mode = 'DEVELOPMENT'
  AND NOT EXISTS (SELECT 1 FROM project_columns c WHERE c.project_id = p.id AND c.kind = 'CANCELLED');

-- 4. New tasks land in the backlog. The version bump makes open clients reload the board instead of
--    writing against the old structure.
UPDATE project p
SET default_pending_column_id = c.id
FROM project_columns c
WHERE c.project_id = p.id AND c.kind = 'BACKLOG' AND p.id IN (SELECT project_id FROM backlog_board);

UPDATE project SET version = version + 1 WHERE mode = 'DEVELOPMENT';
