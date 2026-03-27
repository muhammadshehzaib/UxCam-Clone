import { SessionEvent } from '@/types';

/**
 * Extracts elapsed_ms timestamps for all UI freeze events in a session.
 * Freeze events are already individually tagged (type === 'freeze') — no
 * clustering algorithm needed, unlike rage click detection.
 */
export function detectFreezeTimestamps(events: SessionEvent[]): number[] {
  return events
    .filter((e) => e.type === 'freeze')
    .map((e) => e.elapsed_ms);
}
