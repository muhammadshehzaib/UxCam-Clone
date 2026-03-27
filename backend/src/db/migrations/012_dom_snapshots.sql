-- DOM snapshot storage — full DOM + incremental mutations for session replay
-- Stored as raw TEXT (not JSONB) because individual snapshots can be 100KB–2MB.
CREATE TABLE IF NOT EXISTS dom_snapshots (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL,
  elapsed_ms  INT         NOT NULL,
  type        TEXT        NOT NULL,    -- 'snapshot' | 'mutation'
  data        TEXT        NOT NULL,    -- raw JSON string
  byte_size   INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Replay query: get all frames for a session in playback order
CREATE INDEX IF NOT EXISTS idx_dom_snapshots_session
  ON dom_snapshots(session_id, elapsed_ms ASC);

CREATE INDEX IF NOT EXISTS idx_dom_snapshots_project
  ON dom_snapshots(project_id);
