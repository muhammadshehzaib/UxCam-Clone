import { db } from '../db/client';
import { putGzipped, getGunzipped, minioEnabled } from '../lib/objectStorage';

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

/** Fetch all DOM frames for a session, ordered by elapsed_ms.
 *  Prefers the archived object-storage recording; falls back to live Postgres
 *  rows (sessions still recording, or not yet compacted, or MinIO unavailable). */
export async function getDOMFrames(
  sessionId: string,
  projectId: string
): Promise<DOMFrame[]> {
  if (minioEnabled) {
    const rec = await db.query(
      `SELECT object_key FROM dom_recordings WHERE session_id = $1 AND project_id = $2`,
      [sessionId, projectId]
    );
    if (rec.rows.length > 0) {
      try {
        const buf = await getGunzipped(rec.rows[0].object_key as string);
        return buf.toString('utf8').split('\n').filter(Boolean).map((line, i) => {
          const o = JSON.parse(line) as { elapsed_ms: number; type: DOMFrame['type']; data: string };
          return {
            id:         `${sessionId}-${i}`,
            session_id: sessionId,
            elapsed_ms: o.elapsed_ms,
            type:       o.type,
            data:       o.data,
            byte_size:  0,
            created_at: '',
          } as DOMFrame;
        });
      } catch (err) {
        console.warn(`[dom] failed to read archived recording for ${sessionId}; falling back to Postgres`, err);
      }
    }
  }

  const result = await db.query(
    `SELECT id, session_id, elapsed_ms, type, data, byte_size, created_at
     FROM dom_snapshots
     WHERE session_id = $1 AND project_id = $2
     ORDER BY elapsed_ms ASC`,
    [sessionId, projectId]
  );
  return result.rows as DOMFrame[];
}

/**
 * Archive a session's web DOM frames to object storage: bundle every frame into
 * one gzipped NDJSON object in MinIO, record a pointer in dom_recordings, then
 * delete the heavy dom_snapshots rows. No-op (returns false) when MinIO is off or
 * the session has no frames; on any failure the Postgres rows are left intact.
 */
export async function compactSessionToStorage(
  sessionId: string,
  projectId: string
): Promise<boolean> {
  if (!minioEnabled) return false;
  try {
    const rows = (await db.query(
      `SELECT elapsed_ms, type, data FROM dom_snapshots
       WHERE session_id = $1 AND project_id = $2 ORDER BY elapsed_ms ASC`,
      [sessionId, projectId]
    )).rows as Array<{ elapsed_ms: number; type: string; data: string }>;

    if (rows.length === 0) return false;

    const ndjson = rows
      .map((r) => JSON.stringify({ elapsed_ms: r.elapsed_ms, type: r.type, data: r.data }))
      .join('\n');
    const objectKey = `replays/${projectId}/${sessionId}.dom.ndjson.gz`;
    await putGzipped(objectKey, ndjson);

    await db.query(
      `INSERT INTO dom_recordings (session_id, project_id, object_key, frame_count, byte_size)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_id) DO UPDATE
         SET object_key = EXCLUDED.object_key,
             frame_count = EXCLUDED.frame_count,
             byte_size  = EXCLUDED.byte_size`,
      [sessionId, projectId, objectKey, rows.length, Buffer.byteLength(ndjson, 'utf8')]
    );
    await db.query(
      `DELETE FROM dom_snapshots WHERE session_id = $1 AND project_id = $2`,
      [sessionId, projectId]
    );
    console.log(`[dom] archived ${rows.length} frames for session ${sessionId} -> ${objectKey}`);
    return true;
  } catch (err) {
    console.warn(`[dom] compaction failed for session ${sessionId}; frames remain in Postgres`, err);
    return false;
  }
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
