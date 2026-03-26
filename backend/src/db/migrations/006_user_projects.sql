-- Join table: which users have access to which projects
CREATE TABLE IF NOT EXISTS user_projects (
  user_id    UUID NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id)        ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'admin',
  PRIMARY KEY (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_projects_user
  ON user_projects(user_id);

-- Backfill existing user → project relationships from dashboard_users.project_id
INSERT INTO user_projects (user_id, project_id, role)
SELECT id, project_id, 'admin'
FROM dashboard_users
WHERE project_id IS NOT NULL
ON CONFLICT DO NOTHING;
