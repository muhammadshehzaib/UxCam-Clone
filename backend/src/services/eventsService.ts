import { db } from '../db/client';

export async function getEventsBySession(projectId: string, sessionId: string) {
  const sessionCheck = await db.query(
    'SELECT id FROM sessions WHERE id = $1 AND project_id = $2',
    [sessionId, projectId]
  );
  if (sessionCheck.rows.length === 0) throw new Error('NOT_FOUND');

  const result = await db.query(
    `SELECT id, type, timestamp, elapsed_ms, x, y, target, screen_name, value, metadata
     FROM events
     WHERE session_id = $1
     ORDER BY elapsed_ms ASC`,
    [sessionId]
  );

  return result.rows;
}
