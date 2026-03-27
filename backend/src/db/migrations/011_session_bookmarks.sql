-- Personal session watchlist — each user can bookmark any session
CREATE TABLE IF NOT EXISTS session_bookmarks (
  user_id    UUID NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id)        ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_bookmarks_user
  ON session_bookmarks(user_id, created_at DESC);
