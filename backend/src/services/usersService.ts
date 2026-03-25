import { db } from '../db/client';

export async function listUsers(projectId: string, page: number, limit: number) {
  const offset = (page - 1) * limit;

  const [rowsResult, countResult] = await Promise.all([
    db.query(
      `SELECT id, external_id, anonymous_id, traits, first_seen_at, last_seen_at, session_count
       FROM app_users
       WHERE project_id = $1
       ORDER BY last_seen_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, limit, offset]
    ),
    db.query('SELECT COUNT(*) FROM app_users WHERE project_id = $1', [projectId]),
  ]);

  return {
    data: rowsResult.rows,
    meta: { page, limit, total: parseInt(countResult.rows[0].count, 10) },
  };
}

export async function getUserById(projectId: string, userId: string) {
  const result = await db.query(
    `SELECT id, external_id, anonymous_id, traits, first_seen_at, last_seen_at, session_count
     FROM app_users
     WHERE id = $1 AND project_id = $2`,
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
      `SELECT id, started_at, ended_at, duration_ms, device_type, os, event_count
       FROM sessions
       WHERE user_id = $1 AND project_id = $2
       ORDER BY started_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, projectId, limit, offset]
    ),
    db.query(
      'SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND project_id = $2',
      [userId, projectId]
    ),
  ]);

  return {
    data: rowsResult.rows,
    meta: { page, limit, total: parseInt(countResult.rows[0].count, 10) },
  };
}
