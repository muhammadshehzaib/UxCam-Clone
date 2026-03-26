-- Dashboard users (people who log in to the analytics dashboard)
CREATE TABLE IF NOT EXISTS dashboard_users (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        REFERENCES projects(id) ON DELETE SET NULL,
  email          TEXT        NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  name           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_users_email
  ON dashboard_users(email);
