-- Session list query (most common dashboard query — project + recency)
CREATE INDEX IF NOT EXISTS idx_sessions_project_started
  ON sessions(project_id, started_at DESC);

-- Session filter by user
CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON sessions(user_id);

-- Anonymous user lookup
CREATE INDEX IF NOT EXISTS idx_sessions_anonymous
  ON sessions(project_id, anonymous_id);

-- Replay query: fetch all events for a session in playback order
CREATE INDEX IF NOT EXISTS idx_events_session_elapsed
  ON events(session_id, elapsed_ms ASC);

-- Analytics: event type aggregations
CREATE INDEX IF NOT EXISTS idx_events_project_type
  ON events(project_id, type);

-- Analytics: time-series queries
CREATE INDEX IF NOT EXISTS idx_events_timestamp
  ON events(project_id, timestamp DESC);

-- User lookups
CREATE INDEX IF NOT EXISTS idx_app_users_project
  ON app_users(project_id);

CREATE INDEX IF NOT EXISTS idx_app_users_external
  ON app_users(project_id, external_id)
  WHERE external_id IS NOT NULL;
