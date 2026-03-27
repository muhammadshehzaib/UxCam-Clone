import { db } from '../db/client';

export interface DOMFrame {
  id:         string;
  session_id: string;
  elapsed_ms: number;
  type:       'snapshot' | 'mutation';
  data:       string;   // raw JSON — deserialise on the frontend
  byte_size:  number;
  created_at: string;
}

const MAX_FRAME_BYTES    = 2 * 1024 * 1024;  // 2 MB per frame
const MAX_FRAMES_PER_REQ = 50;               // cap batch size

/** Store a batch of DOM frames (snapshots + mutations) for a session. */
export async function storeDOMFrames(
  sessionId: string,
  projectId: string,
  frames:    Array<{ type: string; elapsedMs: number; data: string }>
): Promise<void> {
  const limited = frames.slice(0, MAX_FRAMES_PER_REQ);

  for (const frame of limited) {
    const dataStr   = typeof frame.data === 'string' ? frame.data : JSON.stringify(frame.data);
    const byteSize  = Buffer.byteLength(dataStr, 'utf8');

    if (byteSize > MAX_FRAME_BYTES) {
      console.warn(`[dom] frame ${frame.type} for session ${sessionId} exceeds 2MB — skipped`);
      continue;
    }

    await db.query(
      `INSERT INTO dom_snapshots (session_id, project_id, elapsed_ms, type, data, byte_size)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, projectId, frame.elapsedMs, frame.type, dataStr, byteSize]
    );
  }
}

/** Fetch all DOM frames for a session, ordered by elapsed_ms. */
export async function getDOMFrames(
  sessionId: string,
  projectId: string
): Promise<DOMFrame[]> {
  const result = await db.query(
    `SELECT id, session_id, elapsed_ms, type, data, byte_size, created_at
     FROM dom_snapshots
     WHERE session_id = $1 AND project_id = $2
     ORDER BY elapsed_ms ASC`,
    [sessionId, projectId]
  );
  return result.rows as DOMFrame[];
}

/** Returns true if a session has any DOM recordings. */
export async function hasDOMRecording(
  sessionId: string,
  projectId: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM dom_snapshots WHERE session_id = $1 AND project_id = $2 LIMIT 1`,
    [sessionId, projectId]
  );
  return result.rows.length > 0;
}
