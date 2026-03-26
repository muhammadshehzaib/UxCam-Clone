import { detectRageClickTimestamps } from '@/lib/rageClickDetector';
import { SessionEvent } from '@/types';

function makeClick(elapsed_ms: number, x: number, y: number): SessionEvent {
  return { id: elapsed_ms, type: 'click', elapsed_ms, x, y, timestamp: '', target: null, screen_name: null, value: null, metadata: {} };
}

function makeScroll(elapsed_ms: number): SessionEvent {
  return { id: elapsed_ms, type: 'scroll', elapsed_ms, x: null, y: null, timestamp: '', target: null, screen_name: null, value: '200', metadata: {} };
}

describe('detectRageClickTimestamps', () => {
  it('returns empty array for empty events', () => {
    expect(detectRageClickTimestamps([])).toEqual([]);
  });

  it('returns empty array when only non-click events', () => {
    expect(detectRageClickTimestamps([makeScroll(0), makeScroll(100)])).toEqual([]);
  });

  it('returns empty array when fewer than 3 clicks', () => {
    const events = [makeClick(0, 0.5, 0.5), makeClick(100, 0.5, 0.5)];
    expect(detectRageClickTimestamps(events)).toEqual([]);
  });

  it('detects 3 rapid clicks at same location', () => {
    const events = [
      makeClick(0,   0.5, 0.5),
      makeClick(150, 0.5, 0.5),
      makeClick(300, 0.5, 0.5),
    ];
    expect(detectRageClickTimestamps(events)).toEqual([0]);
  });

  it('ignores clicks with null x or y', () => {
    const events: SessionEvent[] = [
      { id: 1, type: 'click', elapsed_ms: 0,   x: null, y: 0.5,  timestamp: '', target: null, screen_name: null, value: null, metadata: {} },
      { id: 2, type: 'click', elapsed_ms: 100, x: 0.5,  y: null, timestamp: '', target: null, screen_name: null, value: null, metadata: {} },
      { id: 3, type: 'click', elapsed_ms: 200, x: 0.5,  y: 0.5,  timestamp: '', target: null, screen_name: null, value: null, metadata: {} },
    ];
    expect(detectRageClickTimestamps(events)).toEqual([]);
  });

  it('ignores clicks spread more than 500ms apart', () => {
    const events = [
      makeClick(0,    0.5, 0.5),
      makeClick(600,  0.5, 0.5),
      makeClick(1200, 0.5, 0.5),
    ];
    expect(detectRageClickTimestamps(events)).toEqual([]);
  });

  it('ignores spatially distant clicks', () => {
    const events = [
      makeClick(0,   0.1, 0.1),
      makeClick(100, 0.9, 0.9),
      makeClick(200, 0.5, 0.5),
    ];
    expect(detectRageClickTimestamps(events)).toEqual([]);
  });

  it('returns correct elapsed_ms for rage cluster start', () => {
    const events = [
      makeScroll(0),           // non-click, ignored
      makeClick(1000, 0.5, 0.5),
      makeClick(1100, 0.5, 0.5),
      makeClick(1200, 0.5, 0.5),
    ];
    expect(detectRageClickTimestamps(events)).toEqual([1000]);
  });

  it('detects two separate rage clusters', () => {
    const events = [
      makeClick(0,    0.2, 0.2),
      makeClick(100,  0.2, 0.2),
      makeClick(200,  0.2, 0.2),
      makeScroll(500),
      makeClick(6000, 0.8, 0.8),
      makeClick(6100, 0.8, 0.8),
      makeClick(6200, 0.8, 0.8),
    ];
    expect(detectRageClickTimestamps(events)).toEqual([0, 6000]);
  });

  it('does not double-count a single cluster as two', () => {
    const events = [
      makeClick(0,   0.5, 0.5),
      makeClick(100, 0.5, 0.5),
      makeClick(200, 0.5, 0.5),
      makeClick(300, 0.5, 0.5),
    ];
    expect(detectRageClickTimestamps(events)).toHaveLength(1);
  });

  it('mixed events — only clicks are considered', () => {
    const events = [
      makeScroll(0),
      makeClick(100, 0.5, 0.5),
      makeScroll(150),
      makeClick(200, 0.5, 0.5),
      makeScroll(250),
      makeClick(300, 0.5, 0.5),
    ];
    expect(detectRageClickTimestamps(events)).toEqual([100]);
  });
});
