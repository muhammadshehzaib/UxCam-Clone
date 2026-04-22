-- Add missing FK on dom_snapshots.project_id so orphaned snapshots cannot exist
-- after a project is deleted. Cascade matches the behaviour of all other tables.
ALTER TABLE dom_snapshots
  ADD CONSTRAINT fk_dom_snapshots_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
