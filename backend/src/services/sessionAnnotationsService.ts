import { db } from '../db/client';

/**
 * Merge a note into sessions.metadata without touching other keys.
 * Empty string removes the note (stored as empty — frontend can treat as absent).
 */
export async function updateNote(
  projectId: string,
  sessionId: string,
  note: string
): Promise<void> {
  const result = await db.query(
    `UPDATE sessions
     SET metadata = metadata || $1::jsonb
     WHERE id = $2 AND project_id = $3
     RETURNING id`,
    [JSON.stringify({ note }), sessionId, projectId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
}

/**
 * Merge a tags array into sessions.metadata without touching other keys.
 * Empty array removes all tags.
 */
export async function updateTags(
  projectId: string,
  sessionId: string,
  tags: string[]
): Promise<void> {
  const result = await db.query(
    `UPDATE sessions
     SET metadata = metadata || $1::jsonb
     WHERE id = $2 AND project_id = $3
     RETURNING id`,
    [JSON.stringify({ tags }), sessionId, projectId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
}
