import { SDKEvent } from './types';

type EventQueueFn = (event: SDKEvent) => void;

/** Minimum task duration to report as a UI freeze (ms) */
const FREEZE_THRESHOLD_MS = 500;

/**
 * Attaches a PerformanceObserver for 'longtask' entries.
 * Reports any task that blocks the main thread for ≥500ms as a 'freeze' event.
 *
 * Gracefully degrades on browsers that don't support the Long Tasks API (e.g. Safari).
 * Returns a cleanup function that disconnects the observer.
 */
export function attachFreezeRecorder(
  push: EventQueueFn,
  getElapsedMs: () => number,
  getCurrentScreen: () => string
): () => void {
  let observer: PerformanceObserver | null = null;

  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= FREEZE_THRESHOLD_MS) {
          const durationMs = Math.round(entry.duration);

          push({
            type:       'freeze',
            timestamp:  Date.now(),
            elapsedMs:  getElapsedMs(),
            screenName: getCurrentScreen(),
            value:      String(durationMs),
            metadata:   { duration_ms: durationMs },
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // PerformanceObserver or 'longtask' not supported — silently skip
    observer = null;
  }

  return () => {
    observer?.disconnect();
    observer = null;
  };
}
