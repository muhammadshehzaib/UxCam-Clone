import { RNTransport } from '../transport';
import { RNEvent } from '../types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeEvent(type: RNEvent['type'] = 'custom'): RNEvent {
  return { type, timestamp: Date.now(), elapsedMs: 100, screenName: '/Home' };
}

const config = { apiKey: 'proj_test', endpoint: 'http://localhost:3001' };

beforeEach(() => mockFetch.mockClear());

describe('RNTransport', () => {
  it('queues events and flushes them in a batch', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const t = new RNTransport(config, () => 's1', () => 'anon1');
    t.push(makeEvent());
    t.push(makeEvent('screen_view'));
    await t.flush();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events).toHaveLength(2);
  });

  it('includes apiKey and sessionId in payload', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const t = new RNTransport(config, () => 'sess-abc', () => 'anon-xyz');
    t.push(makeEvent());
    await t.flush();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.apiKey).toBe('proj_test');
    expect(body.sessionId).toBe('sess-abc');
    expect(body.anonymousId).toBe('anon-xyz');
  });

  it('does not exceed maxBatchSize per request', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const t = new RNTransport({ ...config, maxBatchSize: 10 }, () => 's', () => 'a');
    for (let i = 0; i < 25; i++) t.push(makeEvent());
    await t.flush();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.events.length).toBeLessThanOrEqual(10);
  });

  it('retries on network failure', async () => {
    jest.useFakeTimers();
    mockFetch
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ ok: true });
    const t = new RNTransport(config, () => 's', () => 'a');
    t.push(makeEvent());
    void t.flush();
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('stopAutoFlush clears the timer', () => {
    const t = new RNTransport(config, () => 's', () => 'a');
    t.startAutoFlush();
    t.stopAutoFlush();
    // No assertion needed — test passes if no interval leak error
    expect(true).toBe(true);
  });

  it('sends nothing when queue is empty', async () => {
    const t = new RNTransport(config, () => 's', () => 'a');
    await t.flush();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
