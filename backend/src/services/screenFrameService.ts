import { db } from '../db/client';

export interface ScreenFrame {
  id:         string;
  session_id: string;
  elapsed_ms: number;
  data:       string;   // base64 JPEG / data URI
  width:      number;
  height:     number;
  byte_size:  number;
  created_at: string;
}

const MAX_FRAME_BYTES    = 1 * 1024 * 1024;  // 1 MB per screenshot
const MAX_FRAMES_PER_REQ = 30;               // cap batch size

/** Store a batch of screenshot frames for a session. */
export async function storeScreenFrames(
  sessionId: string,
  projectId: string,
  frames:    Array<{ elapsedMs: number; data: string; width?: number; height?: number }>
): Promise<number> {
  const limited = frames.slice(0, MAX_FRAMES_PER_REQ);
  let stored = 0;

  for (const frame of limited) {
    const dataStr  = String(frame.data ?? '');
    const byteSize = Buffer.byteLength(dataStr, 'utf8');

    if (!dataStr || byteSize > MAX_FRAME_BYTES) {
      console.warn(`[screen] frame for session ${sessionId} empty or exceeds 1MB — skipped`);
      continue;
    }

    await db.query(
      `INSERT INTO screen_frames (session_id, project_id, elapsed_ms, data, width, height, byte_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, projectId, frame.elapsedMs, dataStr, frame.width ?? 0, frame.height ?? 0, byteSize]
    );
    stored++;
  }

  return stored;
}

/** Fetch all screenshot frames for a session, ordered by elapsed_ms. */
export async function getScreenFrames(
  sessionId: string,
  projectId: string
): Promise<ScreenFrame[]> {
  const result = await db.query(
    `SELECT id, session_id, elapsed_ms, data, width, height, byte_size, created_at
     FROM screen_frames
     WHERE session_id = $1 AND project_id = $2
     ORDER BY elapsed_ms ASC`,
    [sessionId, projectId]
  );
  return result.rows as ScreenFrame[];
}

/** Returns true if a session has any screen recordings. */
export async function hasScreenRecording(
  sessionId: string,
  projectId: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM screen_frames WHERE session_id = $1 AND project_id = $2 LIMIT 1`,
    [sessionId, projectId]
  );
  return result.rows.length > 0;
}
