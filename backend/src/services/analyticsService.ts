import { db } from '../db/client';
import { redis } from '../db/redis';

export async function getSummary(projectId: string, days: number) {
  const cacheKey = `analytics:summary:${projectId}:${days}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [sessionsResult, topEventsResult, topScreensResult, usersResult] = await Promise.all([
    db.query(
      `SELECT COUNT(*) AS total_sessions,
              AVG(duration_ms) AS avg_duration_ms
       FROM sessions
       WHERE project_id = $1 AND started_at >= $2`,
      [projectId, since]
    ),
    db.query(
      `SELECT value AS name, COUNT(*) AS count
       FROM events
       WHERE project_id = $1 AND type = 'custom' AND timestamp >= $2
       GROUP BY value
       ORDER BY count DESC
       LIMIT 10`,
      [projectId, since]
    ),
    db.query(
      `SELECT screen_name AS name, COUNT(*) AS count
       FROM events
       WHERE project_id = $1 AND screen_name IS NOT NULL AND timestamp >= $2
       GROUP BY screen_name
       ORDER BY count DESC
       LIMIT 10`,
      [projectId, since]
    ),
    db.query(
      'SELECT COUNT(*) AS total FROM app_users WHERE project_id = $1',
      [projectId]
    ),
  ]);

  const summary = {
    totalUsers: parseInt(usersResult.rows[0].total, 10),
    totalSessions: parseInt(sessionsResult.rows[0].total_sessions, 10),
    avgSessionDurationMs: Math.round(parseFloat(sessionsResult.rows[0].avg_duration_ms) || 0),
    topEvents: topEventsResult.rows.map((r) => ({ name: r.name, count: parseInt(r.count, 10) })),
    topScreens: topScreensResult.rows.map((r) => ({ name: r.name, count: parseInt(r.count, 10) })),
  };

  await redis.set(cacheKey, JSON.stringify(summary), 'EX', 60);
  return summary;
}

export async function getCustomEvents(projectId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [eventsResult, totalsResult] = await Promise.all([
    db.query(
      `SELECT value AS name, COUNT(*) AS count
       FROM events
       WHERE project_id = $1 AND type = 'custom' AND timestamp >= $2
         AND value IS NOT NULL
       GROUP BY value
       ORDER BY count DESC
       LIMIT 20`,
      [projectId, since]
    ),
    db.query(
      `SELECT COUNT(*) AS total_events,
              COUNT(DISTINCT value) AS unique_names
       FROM events
       WHERE project_id = $1 AND type = 'custom' AND timestamp >= $2`,
      [projectId, since]
    ),
  ]);

  return {
    events:       eventsResult.rows.map((r) => ({ name: r.name as string, count: parseInt(r.count, 10) })),
    total_events: parseInt(totalsResult.rows[0].total_events, 10),
    unique_names: parseInt(totalsResult.rows[0].unique_names, 10),
  };
}

export async function getCustomEventTimeline(projectId: string, eventName: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await db.query(
    `SELECT DATE(timestamp) AS date, COUNT(*) AS count
     FROM events
     WHERE project_id = $1 AND type = 'custom' AND value = $2 AND timestamp >= $3
     GROUP BY DATE(timestamp)
     ORDER BY date ASC`,
    [projectId, eventName, since]
  );

  return result.rows.map((r) => ({ date: r.date as string, count: parseInt(r.count, 10) }));
}

export async function getSessionsOverTime(projectId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await db.query(
    `SELECT DATE(started_at) AS date, COUNT(*) AS count
     FROM sessions
     WHERE project_id = $1 AND started_at >= $2
     GROUP BY DATE(started_at)
     ORDER BY date ASC`,
    [projectId, since]
  );

  return result.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
}
