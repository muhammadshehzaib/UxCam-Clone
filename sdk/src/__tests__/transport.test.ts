import { Transport } from '../transport';
import { SDKConfig } from '../types';

const config: SDKConfig = {
  apiKey: 'proj_dev_key',
  endpoint: 'http://localhost:3001',
  flushInterval: 99999, // prevent auto-flush during tests
  maxBatchSize: 3,
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeTransport() {
  return new Transport(config, () => 'sess-1', () => 'anon-1');
}

function makeEvent(type = 'click') {
  return { type: type as any, timestamp: Date.now(), elapsedMs: 1000 };
}

describe('Transport', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  describe('push + flush', () => {
    it('flushes queued events to the ingest API', async () => {
      const transport = makeTransport();
      transport.push(makeEvent('click'));
      transport.push(makeEvent('scroll'));

      await transport.flush();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/api/v1/ingest/batch');
      const body = JSON.parse(opts.body);
      expect(body.events).toHaveLength(2);
      expect(body.sessionId).toBe('sess-1');
      expect(body.anonymousId).toBe('anon-1');
      expect(body.apiKey).toBe('proj_dev_key');
    });

    it('does not call fetch when queue is empty', async () => {
      const transport = makeTransport();
      await transport.flush();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('auto-flushes when maxBatchSize is reached', async () => {
      const transport = makeTransport(); // maxBatchSize = 3
      transport.push(makeEvent());
      transport.push(makeEvent());
      // Third push should trigger flush
      transport.push(makeEvent());

      // Flush is async, give microtask queue time to settle
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalled();
    });

    it('sends correct event types in payload', async () => {
      const transport = makeTransport();
      transport.push({ type: 'navigate', timestamp: Date.now(), elapsedMs: 500, value: '/checkout' });

      await transport.flush();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].type).toBe('navigate');
      expect(body.events[0].value).toBe('/checkout');
    });
  });

  describe('retry on failure', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('retries up to 3 times on network failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true });

      const transport = makeTransport();
      transport.push(makeEvent());

      const flushPromise = transport.flush();
      // Advance through each retry delay
      await jest.runAllTimersAsync();
      await flushPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('drops batch after 3 failed retries without throwing', async () => {
      mockFetch.mockRejectedValue(new Error('Permanent failure'));

      const transport = makeTransport();
      transport.push(makeEvent());

      const flushPromise = transport.flush();
      await jest.runAllTimersAsync();
      await expect(flushPromise).resolves.not.toThrow();
      // 1 initial + 3 retries = 4 calls
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('offline handling', () => {
    it('skips flush when offline', async () => {
      const transport = makeTransport();
      transport.push(makeEvent());

      // Simulate offline
      window.dispatchEvent(new Event('offline'));
      await transport.flush();

      expect(mockFetch).not.toHaveBeenCalled();

      // Back online
      window.dispatchEvent(new Event('online'));
    });
  });
});
