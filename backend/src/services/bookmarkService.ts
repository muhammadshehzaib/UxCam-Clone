import { db } from '../db/client';

export interface BookmarkToggleResult {
  bookmarked: boolean;
}

/** Toggle a bookmark — inserts if absent, deletes if present. */
export async function toggleBookmark(
  userId:    string,
  sessionId: string,
  projectId: string
): Promise<BookmarkToggleResult> {
  // Verify the session belongs to the project first
  const sessionCheck = await db.query(
    'SELECT id FROM sessions WHERE id = $1 AND project_id = $2',
    [sessionId, projectId]
  );
  if (sessionCheck.rows.length === 0) throw new Error('NOT_FOUND');

  // Check existing bookmark
  const existing = await db.query(
    'SELECT user_id FROM session_bookmarks WHERE user_id = $1 AND session_id = $2',
    [userId, sessionId]
  );

  if (existing.rows.length > 0) {
    await db.query(
      'DELETE FROM session_bookmarks WHERE user_id = $1 AND session_id = $2',
      [userId, sessionId]
    );
    return { bookmarked: false };
  }

  await db.query(
    'INSERT INTO session_bookmarks (user_id, session_id) VALUES ($1, $2)',
    [userId, sessionId]
  );
  return { bookmarked: true };
}

/** Returns all sessions bookmarked by a user, newest bookmark first. */
export async function listBookmarkedSessions(userId: string, projectId: string) {
  const result = await db.query(
    `SELECT s.id, s.anonymous_id, s.user_id, s.started_at, s.ended_at,
            s.duration_ms, s.device_type, s.os, s.os_version,
            s.browser, s.browser_version, s.app_version,
            s.country, s.city, s.screen_width, s.screen_height,
            s.event_count, s.metadata, u.external_id, u.traits,
            true AS is_bookmarked
     FROM session_bookmarks sb
     JOIN sessions s ON s.id = sb.session_id
     LEFT JOIN app_users u ON u.id = s.user_id
     WHERE sb.user_id = $1 AND s.project_id = $2
     ORDER BY sb.created_at DESC`,
    [userId, projectId]
  );
  return result.rows;
}
