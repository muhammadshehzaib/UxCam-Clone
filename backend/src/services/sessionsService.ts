import { db } from '../db/client';
import { toCsv } from '../lib/csv';

export interface SessionFilters {
  userId?:      string;
  device?:      string;
  os?:          string;
  browser?:     string;
  dateFrom?:    string;
  dateTo?:      string;
  minDuration?: number;   // ms
  rageClick?:   boolean;
  tags?:        string[]; // filter sessions that have ANY of these tags
  screen?:      string;   // filter sessions that visited this screen
}

export async function listSessions(
  projectId: string,
  page: number,
  limit: number,
  filters: SessionFilters
) {
  const offset = (page - 1) * limit;
  const conditions: string[] = ['s.project_id = $1'];
  const params: unknown[] = [projectId];
  let pi = 2;

  if (filters.userId)      { conditions.push(`s.user_id = $${pi++}`);                      params.push(filters.userId); }
  if (filters.device)      { conditions.push(`s.device_type = $${pi++}`);                params.push(filters.device); }
  if (filters.os)          { conditions.push(`s.os ILIKE $${pi++}`);                     params.push(filters.os); }
  if (filters.browser)     { conditions.push(`s.browser ILIKE $${pi++}`);                params.push(filters.browser); }
  if (filters.dateFrom)    { conditions.push(`s.started_at >= $${pi++}`);                params.push(new Date(filters.dateFrom)); }
  if (filters.dateTo)      { conditions.push(`s.started_at <= $${pi++}`);                params.push(new Date(filters.dateTo)); }
  if (filters.minDuration) { conditions.push(`s.duration_ms >= $${pi++}`);               params.push(filters.minDuration); }
  if (filters.rageClick)   { conditions.push(`s.metadata->>'rage_click' = 'true'`); }
  if (filters.screen)      {
    conditions.push(
      `EXISTS (SELECT 1 FROM events e2 WHERE e2.session_id = s.id AND e2.screen_name = $${pi++} AND e2.type IN ('navigate', 'screen_view'))`
    );
    params.push(filters.screen);
  }
  if (filters.tags && filters.tags.length > 0) {
    const tagClauses = filters.tags.map((tag) => {
      params.push(JSON.stringify([tag]));
      return `s.metadata->'tags' @> $${pi++}::jsonb`;
    });
    conditions.push(`(${tagClauses.join(' OR ')})`);
  }

  const where = conditions.join(' AND ');

  const [rowsResult, countResult] = await Promise.all([
    db.query(
      `SELECT s.id, s.anonymous_id, s.user_id, s.started_at, s.ended_at,
              s.duration_ms, s.device_type, s.os, s.os_version,
              s.browser, s.browser_version, s.app_version,
              s.country, s.city, s.screen_width, s.screen_height,
              s.event_count, s.metadata, u.external_id, u.traits
       FROM sessions s
       LEFT JOIN app_users u ON u.id = s.user_id
       WHERE ${where}
       ORDER BY s.started_at DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, limit, offset]
    ),
    db.query(`SELECT COUNT(*) FROM sessions s WHERE ${where}`, params),
  ]);

  return {
    data: rowsResult.rows,
    meta: { page, limit, total: parseInt(countResult.rows[0].count, 10) },
  };
}

export async function getSessionById(projectId: string, sessionId: string) {
  const result = await db.query(
    `SELECT s.*, u.external_id, u.traits
     FROM sessions s
     LEFT JOIN app_users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.project_id = $2`,
    [sessionId, projectId]
  );

  if (result.rows.length === 0) throw new Error('NOT_FOUND');
  return result.rows[0];
}

const EXPORT_HEADERS = [
  'id', 'user_id', 'anonymous_id', 'started_at', 'ended_at',
  'duration_ms', 'device_type', 'os', 'browser', 'country', 'city',
  'event_count', 'rage_click', 'note', 'tags',
];

export async function exportSessionsAsCsv(
  projectId: string,
  filters: SessionFilters
): Promise<string> {
  const conditions: string[] = ['s.project_id = $1'];
  const params: unknown[]    = [projectId];
  let pi = 2;

  if (filters.userId)      { conditions.push(`s.user_id = $${pi++}`);                    params.push(filters.userId); }
  if (filters.device)      { conditions.push(`s.device_type = $${pi++}`);                params.push(filters.device); }
  if (filters.os)          { conditions.push(`s.os ILIKE $${pi++}`);                     params.push(filters.os); }
  if (filters.browser)     { conditions.push(`s.browser ILIKE $${pi++}`);                params.push(filters.browser); }
  if (filters.dateFrom)    { conditions.push(`s.started_at >= $${pi++}`);                params.push(new Date(filters.dateFrom)); }
  if (filters.dateTo)      { conditions.push(`s.started_at <= $${pi++}`);                params.push(new Date(filters.dateTo)); }
  if (filters.minDuration) { conditions.push(`s.duration_ms >= $${pi++}`);               params.push(filters.minDuration); }
  if (filters.rageClick)   { conditions.push(`s.metadata->>'rage_click' = 'true'`); }

  const result = await db.query(
    `SELECT s.id, s.user_id, s.anonymous_id, s.started_at, s.ended_at,
            s.duration_ms, s.device_type, s.os, s.browser,
            s.country, s.city, s.event_count,
            s.metadata->>'rage_click'  AS rage_click,
            s.metadata->>'note'        AS note,
            s.metadata->>'tags'        AS tags
     FROM sessions s
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.started_at DESC
     LIMIT 10000`,
    params
  );

  return toCsv(EXPORT_HEADERS, result.rows);
}
