-- Pinned objectives come first in every view of the Objectives page, as pinned projects do.
ALTER TABLE project_objectives ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;
