import { renderHook, act } from '@testing-library/react';
import { useReplayEngine } from '@/components/replay/useReplayEngine';
import { SessionEvent } from '@/types';

// Mock RAF
let rafCallback: FrameRequestCallback | null = null;
global.requestAnimationFrame = (cb) => { rafCallback = cb; return 1; };
global.cancelAnimationFrame = jest.fn();

const EVENTS: SessionEvent[] = [
  { id: 1, type: 'click',    elapsed_ms: 0,    timestamp: '', x: 0.5, y: 0.5, target: null, screen_name: '/', value: null, metadata: {} },
  { id: 2, type: 'scroll',   elapsed_ms: 2000, timestamp: '', x: null, y: null, target: null, screen_name: '/', value: '200', metadata: {} },
  { id: 3, type: 'navigate', elapsed_ms: 5000, timestamp: '', x: null, y: null, target: null, screen_name: '/checkout', value: '/checkout', metadata: {} },
];

const DURATION = 10000;

describe('useReplayEngine', () => {
  let perfNowSpy: jest.SpyInstance;

  beforeEach(() => {
    rafCallback = null;
    (global.cancelAnimationFrame as jest.Mock).mockClear();
    perfNowSpy = jest.spyOn(global.performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    perfNowSpy.mockRestore();
  });

  it('starts with currentTimeMs=0, not playing, speed=1', () => {
    const { result } = renderHook(() => useReplayEngine(EVENTS, DURATION));
    expect(result.current.currentTimeMs).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.speed).toBe(1);
    expect(result.current.activeEventIndex).toBe(-1);
  });

  it('play() sets isPlaying to true', () => {
    const { result } = renderHook(() => useReplayEngine(EVENTS, DURATION));
    act(() => { result.current.play(); });
    expect(result.current.isPlaying).toBe(true);
  });

  it('pause() stops playback', () => {
    const { result } = renderHook(() => useReplayEngine(EVENTS, DURATION));
    act(() => { result.current.play(); });
    act(() => { result.current.pause(); });
    expect(result.current.isPlaying).toBe(false);
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('seek() updates currentTimeMs and activeEventIndex', () => {
    const { result } = renderHook(() => useReplayEngine(EVENTS, DURATION));

    act(() => { result.current.seek(3000); });

    expect(result.current.currentTimeMs).toBe(3000);
    // At 3000ms: events[0] (0ms) and events[1] (2000ms) are active → index 1
    expect(result.current.activeEventIndex).toBe(1);
  });

  it('seek() finds correct event index via binary search', () => {
    const { result } = renderHook(() => useReplayEngine(EVENTS, DURATION));

    act(() => { result.current.seek(6000); });
    // All 3 events have elapsed_ms <= 6000
    expect(result.current.activeEventIndex).toBe(2);

    act(() => { result.current.seek(500); });
    // Only event[0] (0ms) qualifies
    expect(result.current.activeEventIndex).toBe(0);

    act(() => { result.current.seek(0); });
    // event[0] is at 0ms so it qualifies
    expect(result.current.activeEventIndex).toBe(0);
  });

  it('seek() clamps to [0, durationMs]', () => {
    const { result } = renderHook(() => useReplayEngine(EVENTS, DURATION));

    act(() => { result.current.seek(-500); });
    expect(result.current.currentTimeMs).toBe(0);

    act(() => { result.current.seek(99999); });
    expect(result.current.currentTimeMs).toBe(DURATION);
  });

  it('setSpeed() changes speed value', () => {
    const { result } = renderHook(() => useReplayEngine(EVENTS, DURATION));
    act(() => { result.current.setSpeed(2); });
    expect(result.current.speed).toBe(2);
  });

  it('cancels RAF on unmount', () => {
    const { result, unmount } = renderHook(() => useReplayEngine(EVENTS, DURATION));
    act(() => { result.current.play(); });
    unmount();
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });
});
