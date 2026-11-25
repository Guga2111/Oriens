ALTER TABLE tasks ADD COLUMN description_doc jsonb;

-- Keep the row until the corresponding private file has been deleted, even after task deletion.
CREATE TABLE task_attachments (
    id uuid PRIMARY KEY,
    task_id bigint NOT NULL,
    user_id bigint NOT NULL,
    kind varchar(8) NOT NULL CHECK (kind IN ('image', 'video')),
    content_type varchar(32),
    bytes bigint NOT NULL CHECK (bytes > 0 AND bytes <= 20971520),
    unused_since timestamp(6) with time zone,
    CHECK (unused_since IS NOT NULL OR content_type IS NOT NULL)
);
CREATE INDEX idx_task_attachment_owner_task ON task_attachments (user_id, task_id);
CREATE INDEX idx_task_attachment_unused ON task_attachments (unused_since);

-- An older API can write only the text column during a rollback.
CREATE FUNCTION clear_stale_task_description_doc() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.description IS DISTINCT FROM OLD.description
       AND NEW.description_doc IS NOT DISTINCT FROM OLD.description_doc
       AND OLD.description_doc IS NOT NULL THEN
        NEW.description_doc := NULL;
        UPDATE task_attachments SET unused_since = now()
          WHERE task_id = NEW.id AND user_id = NEW.user_id AND unused_since IS NULL;
    END IF;
    RETURN NEW;
END
$$;

CREATE TRIGGER task_description_legacy_write
    BEFORE UPDATE OF description ON tasks FOR EACH ROW
    EXECUTE FUNCTION clear_stale_task_description_doc();
