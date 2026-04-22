import { db } from '../db/client';
import { redis } from '../db/redis';
import { analyzeAndStoreRageClicks } from './rageClickService';

interface DeviceInfo {
  type?: string;
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  appVersion?: string;
  screenWidth?: number;
  screenHeight?: number;
}

interface RawEvent {
  type?: string;
  timestamp?: number;
  elapsedMs?: number;
  x?: number;
  y?: number;
  target?: string;
  screenName?: string;
  value?: string;
}

export async function startSession(
  projectId: string,
  sessionId: string,
  anonymousId: string,
  startedAt: number,
  device: DeviceInfo
): Promise<void> {
  const userResult = await db.query(
    `INSERT INTO app_users (project_id, anonymous_id, last_seen_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (project_id, anonymous_id)
     DO UPDATE SET last_seen_at = NOW()
     RETURNING id`,
    [projectId, anonymousId]
  );
  const appUserId: string = userResult.rows[0].id;

  await db.query(
    `INSERT INTO sessions (
       id, project_id, anonymous_id, user_id, started_at,
       device_type, os, os_version, browser, browser_version,
       app_version, screen_width, screen_height
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (id) DO NOTHING`,
    [
      sessionId,
      projectId,
      anonymousId,
      appUserId,
      new Date(startedAt ?? Date.now()),
      device.type ?? null,
      device.os ?? null,
      device.osVersion ?? null,
      device.browser ?? null,
      device.browserVersion ?? null,
      device.appVersion ?? null,
      device.screenWidth ?? null,
      device.screenHeight ?? null,
    ]
  );

  await redis.hset(`session:active:${sessionId}`, {
    projectId,
    anonymousId,
    startedAt: startedAt ?? Date.now(),
  });
  await redis.expire(`session:active:${sessionId}`, 1800);
}

// PostgreSQL max params is 65535; with 10 params per event that's 6553 events max.
const MAX_EVENTS_PER_BATCH = 500;

export async function ingestBatch(
  projectId: string,
  sessionId: string,
  events: RawEvent[]
): Promise<number> {
  // Verify session belongs to this project before inserting any events
  const sessionCheck = await db.query(
    'SELECT id FROM sessions WHERE id = $1 AND project_id = $2',
    [sessionId, projectId]
  );
  if (sessionCheck.rows.length === 0) return 0;

  // Cap batch size to stay well under Postgres's 65535-parameter limit
  const capped = events.slice(0, MAX_EVENTS_PER_BATCH);

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let i = 1;

  for (const ev of capped) {
    placeholders.push(
      `($${i},$${i+1},$${i+2},$${i+3},$${i+4},$${i+5},$${i+6},$${i+7},$${i+8},$${i+9})`
    );
    values.push(
      sessionId,
      projectId,
      ev.type ?? 'custom',
      new Date(ev.timestamp ?? Date.now()),
      ev.elapsedMs ?? 0,
      ev.x ?? null,
      ev.y ?? null,
      ev.target ?? null,
      ev.screenName ?? null,
      ev.value ?? null
    );
    i += 10;
  }

  await db.query(
    `INSERT INTO events (session_id, project_id, type, timestamp, elapsed_ms, x, y, target, screen_name, value)
     VALUES ${placeholders.join(',')}`,
    values
  );

  await db.query(
    'UPDATE sessions SET event_count = event_count + $1 WHERE id = $2 AND project_id = $3',
    [capped.length, sessionId, projectId]
  );

  await redis.del(`analytics:summary:${projectId}`);

  return capped.length;
}

export async function endSession(
  projectId: string,
  sessionId: string,
  endedAt: number
): Promise<number> {
  const endTime = new Date(endedAt ?? Date.now());

  const result = await db.query(
    `UPDATE sessions
     SET ended_at = $1,
         duration_ms = EXTRACT(EPOCH FROM ($1 - started_at)) * 1000
     WHERE id = $2 AND project_id = $3
     RETURNING duration_ms`,
    [endTime, sessionId, projectId]
  );

  await db.query(
    `UPDATE app_users au
     SET session_count = session_count + 1,
         last_seen_at = $1
     FROM sessions s
     WHERE s.id = $2 AND s.anonymous_id = au.anonymous_id AND s.project_id = au.project_id`,
    [endTime, sessionId]
  );

  await redis.del(`session:active:${sessionId}`);
  await redis.del(`analytics:summary:${projectId}`);

  // Fire-and-forget rage click analysis — does not block the response
  analyzeAndStoreRageClicks(sessionId, projectId).catch((err) =>
    console.error('rage click analysis failed:', err)
  );

  return result.rows[0]?.duration_ms ?? 0;
}

export async function identifyUser(
  projectId: string,
  anonymousId: string,
  userId: string | null,
  traits: Record<string, unknown>
): Promise<string> {
  const result = await db.query(
    `UPDATE app_users
     SET external_id = COALESCE($1, external_id),
         traits = traits || $2::jsonb,
         last_seen_at = NOW()
     WHERE project_id = $3 AND anonymous_id = $4
     RETURNING id`,
    [userId ?? null, JSON.stringify(traits), projectId, anonymousId]
  );

  if (result.rows.length === 0) throw new Error('NOT_FOUND');

  return result.rows[0].id;
}
