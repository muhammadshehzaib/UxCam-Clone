import { SessionEvent } from '@/types';

export interface FeedbackEvent {
  elapsed_ms: number;
  message:    string;
  rating?:    number;
}

export const FEEDBACK_VALUE = '__feedback__';

/**
 * Extracts feedback submissions from a session's event list.
 * Feedback is stored as custom events with value = '__feedback__'.
 */
export function detectFeedbackEvents(events: SessionEvent[]): FeedbackEvent[] {
  return events
    .filter((e) => e.type === 'custom' && e.value === FEEDBACK_VALUE)
    .map((e) => ({
      elapsed_ms: e.elapsed_ms,
      message:    String((e.metadata as Record<string, unknown>).message ?? ''),
      rating:     (e.metadata as Record<string, unknown>).rating as number | undefined,
    }));
}
