-- One row per session whose web DOM frames have been archived to object storage
-- (MinIO/S3). The heavy frames live as a single gzipped object; Postgres keeps
-- only this ~100-byte pointer. Replaces hundreds of fat dom_snapshots rows.
CREATE TABLE IF NOT EXISTS dom_recordings (
  session_id  UUID        PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL    REFERENCES projects(id) ON DELETE CASCADE,
  object_key  TEXT        NOT NULL,   -- e.g. replays/<projectId>/<sessionId>.dom.ndjson.gz
  frame_count INT         NOT NULL DEFAULT 0,
  byte_size   INT         NOT NULL DEFAULT 0,  -- uncompressed NDJSON size
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dom_recordings_project ON dom_recordings(project_id);
