import { SessionEvent } from '@/types';

const TIME_WINDOW_MS = 500;
const DISTANCE_THRESHOLD = 0.1;
const MIN_CLICKS = 3;

function euclideanDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

/**
 * Detects rage click timestamps from a session's event list.
 * Returns elapsed_ms values for each rage click cluster start.
 * Mirrors the backend detectRageClicks algorithm exactly.
 */
export function detectRageClickTimestamps(events: SessionEvent[]): number[] {
  const clicks = events.filter(
    (e) => e.type === 'click' && e.x !== null && e.y !== null
  ) as Array<SessionEvent & { x: number; y: number }>;

  const timestamps: number[] = [];
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
      timestamps.push(anchor.elapsed_ms);
    }
  }

  return timestamps;
}
