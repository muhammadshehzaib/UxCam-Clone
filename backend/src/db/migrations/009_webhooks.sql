-- Webhook subscriptions — outbound HTTP calls on project events
CREATE TABLE IF NOT EXISTS webhooks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  url        TEXT        NOT NULL,
  events     TEXT[]      NOT NULL DEFAULT '{}',
  secret     TEXT,
  enabled    BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_project ON webhooks(project_id);
