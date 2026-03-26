-- Funnels: saved screen-sequence definitions per project
CREATE TABLE IF NOT EXISTS funnels (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  steps      JSONB       NOT NULL DEFAULT '[]', -- [{"screen": "/home"}, {"screen": "/checkout"}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnels_project
  ON funnels(project_id, created_at DESC);
