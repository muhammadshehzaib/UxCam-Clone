import { SessionEvent } from '@/types';

export interface NetworkFailure {
  elapsed_ms:  number;
  url:         string;
  method:      string;
  status:      number;
  duration_ms: number;
}

/**
 * Extracts network failure details from a session's event list.
 * Returns structured objects — not just timestamps — because the tooltip
 * needs url, method, and status to be meaningful.
 */
export function detectNetworkFailures(events: SessionEvent[]): NetworkFailure[] {
  return events
    .filter((e) => e.type === 'network')
    .map((e) => ({
      elapsed_ms:  e.elapsed_ms,
      url:         String((e.metadata as Record<string, unknown>).url         ?? ''),
      method:      String((e.metadata as Record<string, unknown>).method      ?? 'GET'),
      status:      Number((e.metadata as Record<string, unknown>).status      ?? 0),
      duration_ms: Number((e.metadata as Record<string, unknown>).duration_ms ?? 0),
    }))
    .sort((a, b) => a.elapsed_ms - b.elapsed_ms);
}
