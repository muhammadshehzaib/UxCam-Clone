import { attachNetworkRecorder } from '../networkRecorder';
import { SDKEvent } from '../types';

const SDK_ENDPOINT   = 'http://localhost:3001';
const getElapsedMs   = jest.fn(() => 5000);
const getCurrentScreen = jest.fn(() => '/checkout');

function setup() {
  const pushed: SDKEvent[] = [];
  const push = jest.fn((e: SDKEvent) => pushed.push(e));
  const detach = attachNetworkRecorder(push, getElapsedMs, getCurrentScreen, SDK_ENDPOINT);
  return { push, pushed, detach };
}

afterEach(() => {
  // Each test's setup+detach restores originals
});

describe('attachNetworkRecorder', () => {
  describe('window.fetch patching', () => {
    it('patches window.fetch on attach', () => {
      const original = window.fetch;
      const { detach } = setup();
      expect(window.fetch).not.toBe(original);
      detach();
    });

    it('restores original window.fetch on cleanup', () => {
      const original = window.fetch;
      const { detach } = setup();
      detach();
      expect(window.fetch).toBe(original);
    });

    it('pushes network event when fetch returns status ≥ 400', async () => {
      const { push, detach } = setup();
      global.fetch = jest.fn().mockResolvedValue({ status: 503, ok: false }) as jest.Mock;

      await (window.fetch as Function)('https://api.example.com/data');

      expect(push).toHaveBeenCalledTimes(1);
      detach();
    });

    it('event has type = network', async () => {
      const { pushed, detach } = setup();
      global.fetch = jest.fn().mockResolvedValue({ status: 404, ok: false }) as jest.Mock;

      await (window.fetch as Function)('https://api.example.com/item');

      expect(pushed[0].type).toBe('network');
      detach();
    });

    it('event value is the HTTP status as a string', async () => {
      const { pushed, detach } = setup();
      global.fetch = jest.fn().mockResolvedValue({ status: 429, ok: false }) as jest.Mock;

      await (window.fetch as Function)('https://api.example.com/rate');

      expect(pushed[0].value).toBe('429');
      detach();
    });

    it('does NOT push event when fetch returns 200', async () => {
      const { push, detach } = setup();
      global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true }) as jest.Mock;

      await (window.fetch as Function)('https://api.example.com/ok');

      expect(push).not.toHaveBeenCalled();
      detach();
    });

    it('does NOT push event when fetch returns 301', async () => {
      const { push, detach } = setup();
      global.fetch = jest.fn().mockResolvedValue({ status: 301, ok: false }) as jest.Mock;

      await (window.fetch as Function)('https://api.example.com/redir');

      expect(push).not.toHaveBeenCalled();
      detach();
    });

    it('metadata.url has query params stripped', async () => {
      const { pushed, detach } = setup();
      global.fetch = jest.fn().mockResolvedValue({ status: 500, ok: false }) as jest.Mock;

      await (window.fetch as Function)('https://api.example.com/data?token=secret&page=1');

      const meta = pushed[0].metadata as Record<string, unknown>;
      expect(meta.url).toBe('https://api.example.com/data');
      detach();
    });

    it('metadata.method is uppercase', async () => {
      const { pushed, detach } = setup();
      global.fetch = jest.fn().mockResolvedValue({ status: 400, ok: false }) as jest.Mock;

      await (window.fetch as Function)('https://api.example.com/post', { method: 'post' });

      const meta = pushed[0].metadata as Record<string, unknown>;
      expect(meta.method).toBe('POST');
      detach();
    });

    it('pushes event with status=0 on network error', async () => {
      const { pushed, detach } = setup();
      global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as jest.Mock;

      try {
        await (window.fetch as Function)('https://api.example.com/fail');
      } catch { /* expected */ }

      expect(pushed[0].value).toBe('0');
      const meta = pushed[0].metadata as Record<string, unknown>;
      expect(meta.error).toBe('network_error');
      detach();
    });

    it('does NOT capture calls to the SDK own endpoint', async () => {
      const { push, detach } = setup();
      global.fetch = jest.fn().mockResolvedValue({ status: 500, ok: false }) as jest.Mock;

      await (window.fetch as Function)(`${SDK_ENDPOINT}/api/v1/ingest/batch`);

      expect(push).not.toHaveBeenCalled();
      detach();
    });
  });

  describe('XMLHttpRequest patching', () => {
    it('patches XMLHttpRequest.prototype.open on attach', () => {
      const original = XMLHttpRequest.prototype.open;
      const { detach } = setup();
      expect(XMLHttpRequest.prototype.open).not.toBe(original);
      detach();
    });

    it('restores XMLHttpRequest prototype methods on cleanup', () => {
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;
      const { detach } = setup();
      detach();
      expect(XMLHttpRequest.prototype.open).toBe(originalOpen);
      expect(XMLHttpRequest.prototype.send).toBe(originalSend);
    });
  });
});
