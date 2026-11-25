-- Keep existing PENDING/CONCLUDED values and due_date for client/data compatibility.
ALTER TABLE project_objectives ADD COLUMN description text;
ALTER TABLE project_objectives ADD COLUMN start_date date;
ALTER TABLE project_objectives DROP CONSTRAINT project_objectives_status_check;
ALTER TABLE project_objectives ADD CONSTRAINT project_objectives_status_check
    CHECK (status IN ('BACKLOG', 'PENDING', 'ON_DOING', 'PAUSED', 'CONCLUDED', 'CANCELLED'));
ALTER TABLE project_objectives ADD CONSTRAINT project_objectives_period_check
    CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date);
ALTER TABLE project_objectives ADD CONSTRAINT project_objectives_description_check
    CHECK (description IS NULL OR length(description) <= 10000);
