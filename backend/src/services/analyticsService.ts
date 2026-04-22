import { db } from '../db/client';
import { redis } from '../db/redis';

export async function getSummary(projectId: string, days: number) {
  // Key intentionally omits :days so ingestService.redis.del(`analytics:summary:${projectId}`)
  // can bust all cached summaries for this project regardless of the days window.
  const cacheKey = `analytics:summary:${projectId}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed.__days === days) return parsed;
    // days window changed — fall through to recompute
  }

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

  await redis.set(cacheKey, JSON.stringify({ ...summary, __days: days }), 'EX', 60);
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

export async function getFeedbackSubmissions(projectId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.query(
    `SELECT e.session_id, e.elapsed_ms, e.screen_name,
            e.timestamp AS submitted_at,
            e.metadata->>'message' AS message,
            (e.metadata->>'rating')::int AS rating,
            COALESCE(u.traits->>'email', u.external_id) AS user_email
     FROM events e
     JOIN sessions s ON s.id = e.session_id
     LEFT JOIN app_users u ON u.id = s.user_id
     WHERE e.project_id = $1
       AND e.type = 'custom'
       AND e.value = '__feedback__'
       AND e.timestamp >= $2
     ORDER BY e.timestamp DESC
     LIMIT 100`,
    [projectId, since]
  );
  return result.rows;
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
