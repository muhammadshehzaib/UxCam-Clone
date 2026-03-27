import { db } from '../db/client';
import { fireWebhooks } from './webhookService';

export interface RageClickCluster {
  elapsed_ms: number;
  x: number;
  y: number;
  count: number;
}

interface ClickEvent {
  elapsed_ms: number;
  x: number;
  y: number;
}

const TIME_WINDOW_MS = 500;
const DISTANCE_THRESHOLD = 0.1;
const MIN_CLICKS = 3;

function euclideanDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

/**
 * Pure function — no DB access.
 * Detects rage click clusters from a sorted list of click events.
 */
export function detectRageClicks(clicks: ClickEvent[]): RageClickCluster[] {
  const clusters: RageClickCluster[] = [];
  const used = new Set<number>();

  for (let i = 0; i < clicks.length; i++) {
    if (used.has(i)) continue;

    const anchor = clicks[i];
    const clusterIndices: number[] = [i];

    for (let j = i + 1; j < clicks.length; j++) {
      if (used.has(j)) continue;
      if (clicks[j].elapsed_ms - anchor.elapsed_ms > TIME_WINDOW_MS) break;

      const dist = euclideanDistance(anchor.x, anchor.y, clicks[j].x, clicks[j].y);
      if (dist <= DISTANCE_THRESHOLD) {
        clusterIndices.push(j);
      }
    }

    if (clusterIndices.length >= MIN_CLICKS) {
      clusterIndices.forEach((idx) => used.add(idx));
      clusters.push({
        elapsed_ms: anchor.elapsed_ms,
        x: anchor.x,
        y: anchor.y,
        count: clusterIndices.length,
      });
    }
  }

  return clusters;
}

/**
 * Queries click events for a session, runs detection, and writes results
 * into sessions.metadata. Safe to call fire-and-forget after endSession.
 */
export async function analyzeAndStoreRageClicks(
  sessionId: string,
  projectId: string
): Promise<void> {
  const result = await db.query(
    `SELECT elapsed_ms, x, y
     FROM events
     WHERE session_id = $1
       AND project_id = $2
       AND type = 'click'
       AND x IS NOT NULL
       AND y IS NOT NULL
     ORDER BY elapsed_ms ASC`,
    [sessionId, projectId]
  );

  const clicks: ClickEvent[] = result.rows.map((r) => ({
    elapsed_ms: r.elapsed_ms as number,
    x: r.x as number,
    y: r.y as number,
  }));

  const clusters = detectRageClicks(clicks);

  if (clusters.length === 0) return;

  const timestamps = clusters.map((c) => c.elapsed_ms);
  const totalCount = clusters.reduce((sum, c) => sum + c.count, 0);

  await db.query(
    `UPDATE sessions
     SET metadata = metadata || $1::jsonb
     WHERE id = $2 AND project_id = $3`,
    [
      JSON.stringify({
        rage_click: true,
        rage_click_count: totalCount,
        rage_click_timestamps: timestamps,
      }),
      sessionId,
      projectId,
    ]
  );

  // Fire rage_click.session webhook (fire-and-forget)
  fireWebhooks(projectId, 'rage_click.session', {
    session_id:  sessionId,
    rage_clicks: totalCount,
    timestamps,
  }).catch((err) => console.error('rage_click webhook failed:', err));
}
