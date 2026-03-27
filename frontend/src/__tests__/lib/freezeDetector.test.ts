import { detectFreezeTimestamps } from '@/lib/freezeDetector';
import { SessionEvent } from '@/types';

function makeEvent(type: string, elapsed_ms: number): SessionEvent {
  return {
    id: elapsed_ms, type, elapsed_ms, timestamp: '',
    x: null, y: null, target: null, screen_name: null,
    value: type === 'freeze' ? '600' : null,
    metadata: {},
  };
}

describe('detectFreezeTimestamps', () => {
  it('returns empty array for empty events list', () => {
    expect(detectFreezeTimestamps([])).toEqual([]);
  });

  it('returns empty array when no freeze events exist', () => {
    const events = [makeEvent('click', 1000), makeEvent('scroll', 2000)];
    expect(detectFreezeTimestamps(events)).toEqual([]);
  });

  it('returns elapsed_ms for each freeze event', () => {
    const events = [makeEvent('freeze', 3000), makeEvent('freeze', 7000)];
    expect(detectFreezeTimestamps(events)).toEqual([3000, 7000]);
  });

  it('ignores click events', () => {
    const events = [makeEvent('click', 1000), makeEvent('freeze', 5000)];
    expect(detectFreezeTimestamps(events)).toEqual([5000]);
  });

  it('ignores scroll events', () => {
    const events = [makeEvent('scroll', 500), makeEvent('freeze', 4000)];
    expect(detectFreezeTimestamps(events)).toEqual([4000]);
  });

  it('ignores crash events', () => {
    const events = [makeEvent('crash', 2000), makeEvent('freeze', 6000)];
    expect(detectFreezeTimestamps(events)).toEqual([6000]);
  });

  it('returns only timestamps not full event objects', () => {
    const events = [makeEvent('freeze', 3500)];
    const result = detectFreezeTimestamps(events);
    expect(typeof result[0]).toBe('number');
  });

  it('preserves order of freeze events', () => {
    const events = [
      makeEvent('freeze', 1000),
      makeEvent('click',  2000),
      makeEvent('freeze', 5000),
      makeEvent('freeze', 8000),
    ];
    expect(detectFreezeTimestamps(events)).toEqual([1000, 5000, 8000]);
  });
});
