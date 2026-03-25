-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Projects (API key scoping — multi-tenant boundary)
CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  api_key    TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Identified / anonymous users
CREATE TABLE IF NOT EXISTS app_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  external_id   TEXT,                          -- set via identify(), nullable for anon
  anonymous_id  TEXT NOT NULL,                 -- SDK-generated, persisted to localStorage
  traits        JSONB NOT NULL DEFAULT '{}',   -- { name, email, ... }
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_count INT NOT NULL DEFAULT 0,        -- materialized, incremented on session end
  UNIQUE(project_id, anonymous_id)
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES app_users(id) ON DELETE SET NULL,
  anonymous_id     TEXT NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,                -- NULL = session still active
  duration_ms      INT,                        -- computed on session end
  device_type      TEXT,                       -- mobile | tablet | desktop
  os               TEXT,
  os_version       TEXT,
  browser          TEXT,
  browser_version  TEXT,
  app_version      TEXT,
  country          TEXT,
  city             TEXT,
  screen_width     INT,
  screen_height    INT,
  event_count      INT NOT NULL DEFAULT 0,     -- materialized, incremented on batch ingest
  metadata         JSONB NOT NULL DEFAULT '{}'
);

-- Events (append-only — never UPDATE, only INSERT and SELECT)
CREATE TABLE IF NOT EXISTS events (
  id           BIGSERIAL PRIMARY KEY,
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL,                  -- denormalized for query performance
  type         TEXT NOT NULL,                  -- click|scroll|input|navigate|screen_view|custom
  timestamp    TIMESTAMPTZ NOT NULL,
  elapsed_ms   INT NOT NULL,                   -- ms since session start → drives replay
  x            FLOAT,                          -- normalized 0–1 (null for non-pointer events)
  y            FLOAT,
  target       TEXT,                           -- sanitized CSS selector (max 3 ancestors)
  screen_name  TEXT,                           -- current route at event time
  value        TEXT,                           -- scroll delta, custom event name, etc.
  metadata     JSONB NOT NULL DEFAULT '{}'
);
