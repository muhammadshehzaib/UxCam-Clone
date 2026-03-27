-- Email report subscriptions per project
CREATE TABLE IF NOT EXISTS email_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  frequency    TEXT        NOT NULL DEFAULT 'weekly',
  enabled      BOOLEAN     NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_reports_project
  ON email_reports(project_id);

CREATE INDEX IF NOT EXISTS idx_email_reports_due
  ON email_reports(last_sent_at) WHERE enabled = true;
