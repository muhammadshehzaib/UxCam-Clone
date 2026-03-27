import { attachFreezeRecorder } from '../freezeRecorder';
import { SDKEvent } from '../types';

// ── PerformanceObserver mock ──────────────────────────────────────────────────

type ObserverCallback = (list: { getEntries: () => PerformanceEntry[] }) => void;

let observerCallback: ObserverCallback | null = null;
let observedOptions: { entryTypes: string[] } | null = null;
const mockDisconnect = jest.fn();

class MockPerformanceObserver {
  constructor(cb: ObserverCallback) {
    observerCallback = cb;
  }
  observe(options: { entryTypes: string[] }) {
    observedOptions = options;
  }
  disconnect() {
    mockDisconnect();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fireEntry(duration: number) {
  observerCallback?.({
    getEntries: () => [{ duration, name: 'self', entryType: 'longtask', startTime: 0, toJSON: () => ({}) }],
  });
}

const getElapsedMs    = jest.fn(() => 8000);
const getCurrentScreen = jest.fn(() => '/dashboard');

function setup() {
  observerCallback  = null;
  observedOptions   = null;
  mockDisconnect.mockClear();

  const pushed: SDKEvent[] = [];
  const push = jest.fn((e: SDKEvent) => pushed.push(e));
  const detach = attachFreezeRecorder(push, getElapsedMs, getCurrentScreen);
  return { push, pushed, detach };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('attachFreezeRecorder', () => {
  beforeAll(() => {
    (global as unknown as Record<string, unknown>).PerformanceObserver = MockPerformanceObserver;
  });

  afterAll(() => {
    delete (global as unknown as Record<string, unknown>).PerformanceObserver;
  });

  it('observes PerformanceObserver with longtask entry type', () => {
    setup();
    expect(observedOptions?.entryTypes).toContain('longtask');
  });

  it('pushes freeze event when task duration ≥ 500ms', () => {
    const { push } = setup();
    fireEntry(650);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('does NOT push event when task duration < 500ms', () => {
    const { push } = setup();
    fireEntry(200); // long task but below freeze threshold
    expect(push).not.toHaveBeenCalled();
  });

  it('event has type = freeze', () => {
    const { pushed } = setup();
    fireEntry(600);
    expect(pushed[0].type).toBe('freeze');
  });

  it('event value is the duration rounded to ms as a string', () => {
    const { pushed } = setup();
    fireEntry(648.7);
    expect(pushed[0].value).toBe('649');
  });

  it('metadata.duration_ms is the numeric rounded duration', () => {
    const { pushed } = setup();
    fireEntry(648.7);
    expect((pushed[0].metadata as Record<string, unknown>).duration_ms).toBe(649);
  });

  it('elapsed_ms is populated from getElapsedMs()', () => {
    const { pushed } = setup();
    fireEntry(600);
    expect(pushed[0].elapsedMs).toBe(8000);
  });

  it('screenName is populated from getCurrentScreen()', () => {
    const { pushed } = setup();
    fireEntry(600);
    expect(pushed[0].screenName).toBe('/dashboard');
  });

  it('returns a cleanup function that calls observer.disconnect()', () => {
    const { detach } = setup();
    detach();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('calling cleanup twice does not throw', () => {
    const { detach } = setup();
    expect(() => { detach(); detach(); }).not.toThrow();
  });

  it('does not throw when PerformanceObserver is not supported', () => {
    const saved = (global as unknown as Record<string, unknown>).PerformanceObserver;
    delete (global as unknown as Record<string, unknown>).PerformanceObserver;
    expect(() => {
      attachFreezeRecorder(jest.fn(), jest.fn(() => 0), jest.fn(() => '/'));
    }).not.toThrow();
    (global as unknown as Record<string, unknown>).PerformanceObserver = saved;
  });
});
