import { db } from '../db/client';
import { toCsv } from '../lib/csv';

export interface UserFilters {
  device?:      string;
  os?:          string;
  browser?:     string;
  minDuration?: number;   // ms
  rageClick?:   boolean;
  search?:       string;   // matches external_id, traits.name, traits.email
  traitFilters?: { key: string; value: string }[];
}

export async function listUsers(
  projectId: string,
  page: number,
  limit: number,
  filters: UserFilters = {}
) {
  const offset = (page - 1) * limit;

  const conditions: string[] = ['u.project_id = $1'];
  const params: unknown[]    = [projectId];
  let pi = 2;

  // When any session-level filter is set, add an EXISTS subquery
  const sessionConditions: string[] = [];
  if (filters.device)      { sessionConditions.push(`s.device_type = $${pi++}`);                    params.push(filters.device); }
  if (filters.os)          { sessionConditions.push(`s.os ILIKE $${pi++}`);                         params.push(filters.os); }
  if (filters.browser)     { sessionConditions.push(`s.browser ILIKE $${pi++}`);                    params.push(filters.browser); }
  if (filters.minDuration) { sessionConditions.push(`s.duration_ms >= $${pi++}`);                   params.push(filters.minDuration); }
  if (filters.rageClick)   { sessionConditions.push(`s.metadata->>'rage_click' = 'true'`); }

  if (sessionConditions.length > 0) {
    conditions.push(
      `EXISTS (
         SELECT 1 FROM sessions s
         WHERE s.anonymous_id = u.anonymous_id
           AND s.project_id = u.project_id
           AND ${sessionConditions.join(' AND ')}
       )`
    );
  }

  // Full-text search across external_id, trait name, and trait email
  if (filters.search) {
    conditions.push(
      `(u.external_id       ILIKE $${pi}
        OR u.traits->>'name'  ILIKE $${pi}
        OR u.traits->>'email' ILIKE $${pi})`
    );
    params.push(`%${filters.search}%`);
    pi++;
  }

  if (filters.traitFilters && filters.traitFilters.length > 0) {
    for (const { key, value } of filters.traitFilters) {
      if (key && value) {
        conditions.push(`u.traits->>'${key.replace(/'/g, "''")}' ILIKE $${pi++}`);
        params.push(`%${value}%`);
      }
    }
  }

  const where = conditions.join(' AND ');

  const [rowsResult, countResult] = await Promise.all([
    db.query(
      `SELECT u.id, u.external_id, u.anonymous_id, u.traits,
              u.first_seen_at, u.last_seen_at,
              (SELECT COUNT(*) FROM sessions s
               WHERE s.anonymous_id = u.anonymous_id AND s.project_id = u.project_id) AS session_count
       FROM app_users u
       WHERE ${where}
       ORDER BY u.last_seen_at DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) FROM app_users u WHERE ${where}`,
      params
    ),
  ]);

  return {
    data: rowsResult.rows,
    meta: { page, limit, total: parseInt(countResult.rows[0].count, 10) },
  };
}

export async function getTraitKeys(projectId: string): Promise<string[]> {
  const result = await db.query(
    `SELECT DISTINCT jsonb_object_keys(traits) AS key
     FROM app_users
     WHERE project_id = $1 AND traits != '{}'::jsonb
     ORDER BY key ASC
     LIMIT 50`,
    [projectId]
  );
  return result.rows.map((r) => r.key as string);
}

export async function exportUsersAsCsv(
  projectId: string,
  filters: UserFilters = {}
): Promise<string> {
  const conditions: string[] = ['u.project_id = $1'];
  const params: unknown[]    = [projectId];
  let pi = 2;

  const sessionConditions: string[] = [];
  if (filters.device)      { sessionConditions.push(`s.device_type = $${pi++}`);   params.push(filters.device); }
  if (filters.os)          { sessionConditions.push(`s.os ILIKE $${pi++}`);         params.push(filters.os); }
  if (filters.browser)     { sessionConditions.push(`s.browser ILIKE $${pi++}`);   params.push(filters.browser); }
  if (filters.minDuration) { sessionConditions.push(`s.duration_ms >= $${pi++}`);  params.push(filters.minDuration); }
  if (filters.rageClick)   { sessionConditions.push(`s.metadata->>'rage_click' = 'true'`); }

  if (sessionConditions.length > 0) {
    conditions.push(
      `EXISTS (SELECT 1 FROM sessions s WHERE s.anonymous_id = u.anonymous_id AND s.project_id = u.project_id AND ${sessionConditions.join(' AND ')})`
    );
  }

  if (filters.search) {
    conditions.push(
      `(u.external_id ILIKE $${pi} OR u.traits->>'name' ILIKE $${pi} OR u.traits->>'email' ILIKE $${pi})`
    );
    params.push(`%${filters.search}%`);
    pi++;
  }

  const result = await db.query(
    `SELECT
       u.id,
       u.external_id,
       u.anonymous_id,
       u.traits->>'name'  AS name,
       u.traits->>'email' AS email,
       u.first_seen_at,
       u.last_seen_at,
       (SELECT COUNT(*) FROM sessions s
        WHERE s.anonymous_id = u.anonymous_id AND s.project_id = u.project_id) AS session_count
     FROM app_users u
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.last_seen_at DESC
     LIMIT 10000`,
    params
  );

  return toCsv(
    ['id', 'external_id', 'anonymous_id', 'name', 'email', 'first_seen_at', 'last_seen_at', 'session_count'],
    result.rows
  );
}

export async function getUserById(projectId: string, userId: string) {
  const result = await db.query(
    `SELECT u.id, u.external_id, u.anonymous_id, u.traits, u.first_seen_at, u.last_seen_at,
            (SELECT COUNT(*) FROM sessions s
             WHERE s.anonymous_id = u.anonymous_id AND s.project_id = u.project_id) AS session_count
     FROM app_users u
     WHERE u.id = $1 AND u.project_id = $2`,
    [userId, projectId]
  );

  if (result.rows.length === 0) throw new Error('NOT_FOUND');
  return result.rows[0];
}

export async function listUserSessions(
  projectId: string,
  userId: string,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;

  const [rowsResult, countResult] = await Promise.all([
    db.query(
      `SELECT s.id, s.started_at, s.ended_at, s.duration_ms, s.device_type, s.os, s.event_count
       FROM sessions s
       JOIN app_users u ON u.anonymous_id = s.anonymous_id AND u.project_id = s.project_id
       WHERE u.id = $1 AND s.project_id = $2
       ORDER BY s.started_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, projectId, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) FROM sessions s
       JOIN app_users u ON u.anonymous_id = s.anonymous_id AND u.project_id = s.project_id
       WHERE u.id = $1 AND s.project_id = $2`,
      [userId, projectId]
    ),
  ]);

  return {
    data: rowsResult.rows,
    meta: { page, limit, total: parseInt(countResult.rows[0].count, 10) },
  };
}
