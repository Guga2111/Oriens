-- How each person opens a task: side panel (peek), modal or full screen. Null reads as peek.
ALTER TABLE users ADD COLUMN task_view varchar(20)
  CHECK (task_view IS NULL OR task_view::text = ANY (ARRAY['peek','modal','full']::text[]));
