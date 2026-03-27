-- Project invites: allow admins to invite teammates by email
CREATE TABLE IF NOT EXISTS project_invites (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'viewer',
  token        TEXT        NOT NULL UNIQUE,
  invited_by   UUID        NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_invites_token
  ON project_invites(token);

CREATE INDEX IF NOT EXISTS idx_project_invites_project
  ON project_invites(project_id);

CREATE INDEX IF NOT EXISTS idx_project_invites_email
  ON project_invites(email);
