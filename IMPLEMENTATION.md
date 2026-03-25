# UXCam Clone — Implementation Notes

> Canonical reference for architecture decisions, schema rationale, API contracts, SDK design, and setup instructions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Setup](#setup)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Contracts](#api-contracts)
6. [SDK Design](#sdk-design)
7. [Session Replay Design](#session-replay-design)
8. [Key Decisions](#key-decisions)

---

## Project Overview

A UXCam-inspired analytics platform MVP with three components:

| Component | Path | Purpose |
|-----------|------|---------|
| **SDK** | `packages/sdk` | JS library that records user interactions in a browser/app |
| **API** | `apps/api` | Node.js/Express backend — ingests events, serves dashboard data |
| **Dashboard** | `apps/dashboard` | Next.js 16.2.1 web app — session list, replay viewer, user analytics |

**Tech Stack:**
- Next.js 16.2.1 (App Router, React Server Components)
- Node.js + Express (API)
- PostgreSQL 16 (primary data store)
- Redis 7 (caching, rate limiting, active session buffer)
- TypeScript throughout

---

## Setup

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- npm 10+

### Local Development

```bash
# 1. Start Postgres and Redis
docker-compose up -d

# 2. Install all workspace dependencies
npm install

# 3. Copy environment variables
cp .env.example .env

# 4. Run database migrations
npm run migrate --workspace=apps/api

# 5. Start all services in dev mode
npm run dev
```

**Services:**
- Dashboard: http://localhost:3000
- API: http://localhost:3001
- Postgres: localhost:5432 (db: uxclone, user: uxclone, pass: uxclone)
- Redis: localhost:6379

### Seeded Dev Data
- Project: `Dev Project`, `api_key = proj_dev_key`
- Load `packages/sdk/dev/test-harness.html` in a browser to generate synthetic sessions

---

## Architecture

```
Browser (SDK)                   API (Express)              Dashboard (Next.js)
     │                               │                            │
     │  POST /ingest/session/start   │                            │
     │──────────────────────────────>│  upsert app_users          │
     │                               │  insert sessions           │
     │                               │  cache in Redis            │
     │  POST /ingest/batch           │                            │
     │──────────────────────────────>│  bulk insert events        │
     │  (every 5s, up to 50 events)  │  increment event_count     │
     │                               │                            │
     │  POST /ingest/session/end     │                            │
     │──────────────────────────────>│  compute duration          │
     │                               │  flush Redis → Postgres    │
     │                               │                            │
     │                               │  GET /analytics/summary    │
     │                               │<──────────────────────────│
     │                               │  (Redis cache 60s TTL)     │
     │                               │                            │
     │                               │  GET /sessions/:id/events  │
     │                               │<──────────────────────────│
     │                               │  ORDER BY elapsed_ms ASC   │
```

### Monorepo Structure

```
clone/
├── IMPLEMENTATION.md
├── package.json          # npm workspaces root
├── turbo.json            # Turborepo build pipeline
├── docker-compose.yml    # Postgres 16 + Redis 7
├── .env.example
├── packages/
│   └── sdk/              # @uxclone/sdk
└── apps/
    ├── api/              # Express backend (port 3001)
    └── dashboard/        # Next.js 16.2.1 (port 3000)
```

---

## Database Schema

### Design Principles
- `projects` table scopes all data — multi-tenant ready from day one
- `sessions` is the central entity; all queries start here
- `events` is append-only — never UPDATE, only INSERT and SELECT
- `event_count` is materialized on `sessions` (incremented atomically on batch ingest) so dashboard queries never need a live `COUNT(events)` JOIN
- All coordinates stored as normalized floats (0.0–1.0) so replay works at any screen size

### Tables

```sql
projects
  id UUID PK
  name TEXT
  api_key TEXT UNIQUE          -- SDK authenticates with this
  created_at TIMESTAMPTZ

app_users
  id UUID PK
  project_id UUID FK → projects
  external_id TEXT NULL         -- your app's user ID (set via identify())
  anonymous_id TEXT NOT NULL    -- SDK-generated, persisted to localStorage
  traits JSONB                  -- { name, email, ... } from identify()
  first_seen_at TIMESTAMPTZ
  last_seen_at TIMESTAMPTZ
  session_count INT             -- materialized, incremented on session end
  UNIQUE(project_id, anonymous_id)

sessions
  id UUID PK
  project_id UUID FK → projects
  user_id UUID FK → app_users NULL (NULL = anonymous)
  anonymous_id TEXT
  started_at TIMESTAMPTZ
  ended_at TIMESTAMPTZ NULL     -- NULL = session still active
  duration_ms INT NULL          -- computed on session end
  device_type TEXT              -- mobile | tablet | desktop
  os TEXT, os_version TEXT
  browser TEXT, browser_version TEXT
  app_version TEXT
  country TEXT, city TEXT
  screen_width INT, screen_height INT
  event_count INT               -- materialized
  metadata JSONB

events
  id BIGSERIAL PK
  session_id UUID FK → sessions
  project_id UUID               -- denormalized for partition-friendly queries
  type TEXT                     -- click | scroll | input | navigate | screen_view | custom
  timestamp TIMESTAMPTZ
  elapsed_ms INT                -- ms since session start → drives replay timeline
  x FLOAT NULL                  -- normalized 0–1 (null for non-pointer events)
  y FLOAT NULL
  target TEXT NULL              -- sanitized CSS selector (max 3 ancestors)
  screen_name TEXT NULL         -- current route at time of event
  value TEXT NULL               -- scroll delta, custom event name, etc.
  metadata JSONB
```

### Indexes

```sql
-- Session list queries (most common dashboard query)
idx_sessions_project_started ON sessions(project_id, started_at DESC)

-- Replay query (fetches all events for one session in order)
idx_events_session_elapsed ON events(session_id, elapsed_ms ASC)

-- Analytics aggregations
idx_events_project_type ON events(project_id, type)
idx_events_timestamp ON events(project_id, timestamp DESC)

-- User lookups
idx_app_users_project ON app_users(project_id)
idx_app_users_external ON app_users(project_id, external_id) WHERE external_id IS NOT NULL
```

### Redis Keys

| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `session:active:{sessionId}` | Hash | 30 min | Buffer for in-progress session data |
| `ratelimit:{apiKey}:{minute}` | Counter | 60s | Ingest rate limiting (500 req/min) |
| `analytics:summary:{projectId}` | String (JSON) | 60s | Dashboard summary cache |

---

## API Contracts

### Base URL
`http://localhost:3001/api/v1`

### Authentication
- **Ingest routes**: `api_key` field in JSON body (SDK-facing, no headers needed)
- **Read routes**: `Authorization: Bearer <jwt>` (dashboard-facing)

### Ingest Endpoints

#### `POST /ingest/session/start`
```json
// Request
{
  "sessionId": "uuid",
  "anonymousId": "uuid",
  "apiKey": "proj_dev_key",
  "startedAt": 1711000000000,
  "device": {
    "type": "desktop",
    "os": "macOS",
    "osVersion": "14.0",
    "browser": "Chrome",
    "browserVersion": "123",
    "screenWidth": 1440,
    "screenHeight": 900,
    "appVersion": "1.0.0"
  }
}
// Response: 201 { "data": { "sessionId": "uuid" } }
```

#### `POST /ingest/batch`
```json
// Request
{
  "sessionId": "uuid",
  "anonymousId": "uuid",
  "apiKey": "proj_dev_key",
  "events": [
    {
      "type": "click",
      "timestamp": 1711000004200,
      "elapsedMs": 4200,
      "x": 0.42,
      "y": 0.78,
      "target": "button#submit",
      "screenName": "/checkout",
      "metadata": {}
    }
  ]
}
// Response: 200 { "data": { "inserted": 1 } }
```

#### `POST /ingest/session/end`
```json
// Request
{ "sessionId": "uuid", "apiKey": "proj_dev_key", "endedAt": 1711000120000 }
// Response: 200 { "data": { "durationMs": 120000 } }
```

#### `POST /ingest/identify`
```json
// Request
{
  "anonymousId": "uuid",
  "apiKey": "proj_dev_key",
  "userId": "user_123",
  "traits": { "name": "Alice", "email": "alice@example.com" }
}
// Response: 200 { "data": { "userId": "uuid" } }
```

### Read Endpoints

#### `GET /analytics/summary?days=30`
```json
{
  "data": {
    "totalUsers": 1240,
    "totalSessions": 3820,
    "avgSessionDurationMs": 142000,
    "topEvents": [{ "name": "button_click", "count": 9400 }],
    "topScreens": [{ "name": "/dashboard", "count": 3100 }]
  }
}
```

#### `GET /sessions?page=1&limit=20&dateFrom=...&dateTo=...&device=mobile`
```json
{
  "data": [ { "id": "uuid", "startedAt": "...", "durationMs": 142000, "deviceType": "mobile", "eventCount": 48, ... } ],
  "meta": { "page": 1, "limit": 20, "total": 342 }
}
```

#### `GET /sessions/:id/events`
```json
{
  "data": [
    { "id": 1, "type": "click", "elapsedMs": 4200, "x": 0.42, "y": 0.78, "target": "button#submit", "screenName": "/checkout" },
    ...
  ]
}
```

---

## SDK Design

### Philosophy
- **Zero dependencies** — vanilla TypeScript, no runtime imports
- **Privacy by default** — input values never captured; only selector + value length
- **Resilient** — holds queue offline, retries on failure, falls back to `sendBeacon` on unload
- **Minimal footprint** — target ~8KB gzipped

### Public API

```typescript
// Initialize (call once, early in app boot)
UXClone.init({
  apiKey: 'proj_dev_key',
  endpoint: 'http://localhost:3001',
  flushInterval: 5000,    // ms between batch sends
  maxBatchSize: 50,       // max events per batch
  sampleRate: 1.0,        // 0.0–1.0 fraction of sessions to record
});

// Identify a user (call after login)
UXClone.identify('user_123', { name: 'Alice', email: 'alice@example.com' });

// Track a custom event
UXClone.track('purchase_completed', { amount: 49.99, currency: 'USD' });

// Track a screen/page view (for SPAs)
UXClone.trackScreen('/checkout');
```

### Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `session.ts` | Generate/persist `sessionId` + `anonymousId`, collect device fingerprint, manage 30-min inactivity expiry, fire session start/end API calls |
| `recorder.ts` | Attach passive DOM event listeners (click, scroll, input, popstate), normalize coordinates, sanitize selectors, push to transport queue |
| `transport.ts` | Maintain in-memory event queue, batch flush via `fetch` / `sendBeacon`, exponential backoff retries, offline hold |
| `types.ts` | Shared TypeScript interfaces for SDK events, session payloads, device info |
| `index.ts` | Public API surface — `init`, `identify`, `track`, `trackScreen` |

### PII Protection Rules (in recorder.ts)
- `input` / `change` events: capture selector and `value.length` only — **never the actual value**
- `type=password`, `type=tel`, `autocomplete=cc-*` inputs: completely excluded from capture
- CSS selectors: max 3 ancestor levels, only `id` and class attributes — no `data-*` values that might contain PII
- Geolocation: server-side from ingest request IP only — SDK never calls browser geolocation API

---

## Session Replay Design

### Approach: Event-Marker Replay (not DOM snapshot)

UXCam mobile records a screen capture video. For this web MVP, we use **event-marker replay**: a device frame with animated tap/scroll indicators overlaid. This is the correct approach because:

- Full DOM snapshot replay (rrweb-style) requires ~40KB SDK, complex serialization, and a far more complex player
- Event-marker replay is visually equivalent to what UXCam shows for mobile apps
- Can always upgrade to rrweb later without changing the ingest pipeline

### Replay Engine (`useReplayEngine` hook)

```
Inputs:  events: Event[], durationMs: number
State:   currentTimeMs, isPlaying, speed, activeEventIndex
Outputs: play(), pause(), seek(ms), setSpeed(n)

RAF loop (when playing):
  1. Get wall-clock delta since last frame (performance.now())
  2. Advance currentTimeMs += delta * speed
  3. Clamp to [0, durationMs]
  4. Binary-search events[] for largest index where elapsed_ms <= currentTimeMs
  5. Set activeEventIndex → triggers ReplayCanvas re-render
  6. If currentTimeMs === durationMs: auto-pause
```

### Component Hierarchy

```
ReplayViewer (Server Component — fetches session + events)
  └── ReplayViewerClient (Client Component — owns useReplayEngine)
        ├── ReplayCanvas         (renders device frame + animated tap indicator)
        ├── SessionInfoPanel     (static device/OS metadata display)
        ├── TimelineBar          (event dots + draggable scrubber)
        └── PlaybackControls     (play/pause, speed select, time display)
```

### Event Color Coding (TimelineBar)

| Event Type | Color |
|------------|-------|
| click | Blue (#3B82F6) |
| scroll | Gray (#9CA3AF) |
| navigate | Purple (#8B5CF6) |
| input | Yellow (#F59E0B) |
| custom | Orange (#F97316) |
| screen_view | Teal (#14B8A6) |

---

## Key Decisions

### Why materialized `event_count` instead of live COUNT?
Dashboard session list query runs frequently. `COUNT(events)` across millions of rows would be slow. We increment `event_count` atomically on each batch ingest (`UPDATE sessions SET event_count = event_count + $n WHERE id = $1`), so the list query never touches the events table.

### Why Redis for active sessions?
Session start/end happens via separate HTTP requests (could be seconds to hours apart). We store partial session state in Redis (TTL 30min) to avoid hitting Postgres on every batch ingest. On session end, we do one final Postgres write with the complete data.

### Why normalized coordinates (0–1)?
Screen sizes vary. Storing `x` as a fraction of screen width means the replay viewer can scale the device frame to any size and correctly position tap indicators without needing to know the original screen dimensions at capture time.

### Why Next.js App Router with Server Components?
Dashboard pages that just display data (session list, user list, analytics summary) use Server Components — they fetch data at render time with no client-side loading states. Only the replay viewer is a Client Component (needs RAF loop, pointer events, playback state).

### Why not rrweb for session recording?
rrweb records full DOM mutations as a video-like stream. It's the right choice for a web product analytics tool. But UXCam is mobile-first and uses actual screen recordings. For this MVP, event-marker replay correctly models the UXCam experience without the complexity. rrweb can be swapped in later for the SDK's `recorder.ts` with no changes to the ingest pipeline.
