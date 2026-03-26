import { db } from '../db/client';

export interface CrashGroup {
  message: string;
  filename: string;
  total_occurrences: number;
  affected_sessions: number;
  first_seen: string;
  last_seen: string;
}

export interface CrashSession {
  id: string;
  anonymous_id: string;
  external_id: string | null;
  started_at: string;
  duration_ms: number | null;
  device_type: string | null;
  os: string | null;
  crash_elapsed_ms: number;
}

export async function getCrashGroups(
  projectId: string,
  days: number
): Promise<CrashGroup[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await db.query(
    `SELECT
       value                        AS message,
       COALESCE(metadata->>'filename', 'unknown') AS filename,
       COUNT(*)                     AS total_occurrences,
       COUNT(DISTINCT session_id)   AS affected_sessions,
       MIN(timestamp)               AS first_seen,
       MAX(timestamp)               AS last_seen
     FROM events
     WHERE project_id = $1
       AND type = 'crash'
       AND timestamp >= $2
     GROUP BY value, metadata->>'filename'
     ORDER BY affected_sessions DESC, total_occurrences DESC
     LIMIT 50`,
    [projectId, since]
  );

  return result.rows.map((r) => ({
    message:           r.message as string,
    filename:          r.filename as string,
    total_occurrences: parseInt(r.total_occurrences, 10),
    affected_sessions: parseInt(r.affected_sessions, 10),
    first_seen:        r.first_seen as string,
    last_seen:         r.last_seen  as string,
  }));
}

export async function getCrashSessions(
  projectId: string,
  message: string,
  filename: string | undefined,
  days: number
): Promise<CrashSession[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const params: unknown[] = [projectId, message, since];

  const filenameClause = filename
    ? `AND metadata->>'filename' = $${params.push(filename)}`
    : '';

  const result = await db.query(
    `SELECT DISTINCT ON (s.id)
       s.id,
       s.anonymous_id,
       s.started_at,
       s.duration_ms,
       s.device_type,
       s.os,
       u.external_id,
       e.elapsed_ms AS crash_elapsed_ms
     FROM sessions s
     JOIN events e ON e.session_id = s.id
     LEFT JOIN app_users u ON u.id = s.user_id
     WHERE s.project_id = $1
       AND e.type = 'crash'
       AND e.value = $2
       AND s.started_at >= $3
       ${filenameClause}
     ORDER BY s.id, e.elapsed_ms ASC`,
    params
  );

  return result.rows as CrashSession[];
}
