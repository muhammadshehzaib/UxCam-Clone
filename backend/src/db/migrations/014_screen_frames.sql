-- Mobile screen-recording storage — periodic screenshots for native session
-- replay (iOS/Android/React Native have no DOM, so we store image frames).
-- Mirrors dom_snapshots: image data is base64/data-URI TEXT because a frame can
-- be tens to hundreds of KB. width/height drive the player's aspect ratio.
CREATE TABLE IF NOT EXISTS screen_frames (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  elapsed_ms  INT         NOT NULL,
  data        TEXT        NOT NULL,    -- base64 JPEG / data URI
  width       INT         NOT NULL DEFAULT 0,
  height      INT         NOT NULL DEFAULT 0,
  byte_size   INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Replay query: get all frames for a session in playback order
CREATE INDEX IF NOT EXISTS idx_screen_frames_session
  ON screen_frames(session_id, elapsed_ms ASC);

CREATE INDEX IF NOT EXISTS idx_screen_frames_project
  ON screen_frames(project_id);
