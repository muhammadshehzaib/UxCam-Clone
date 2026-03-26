import { attachErrorRecorder } from '../errorRecorder';
import { SDKEvent } from '../types';

const getElapsedMs    = jest.fn(() => 5000);
const getCurrentScreen = jest.fn(() => '/checkout');

function setup() {
  const pushed: SDKEvent[] = [];
  const push = jest.fn((e: SDKEvent) => pushed.push(e));
  const detach = attachErrorRecorder(push, getElapsedMs, getCurrentScreen);
  return { push, pushed, detach };
}

afterEach(() => {
  // Clean up handlers between tests
  window.onerror = null;
});

describe('attachErrorRecorder', () => {
  describe('window.onerror', () => {
    it('captures window.onerror and pushes a crash event', () => {
      const { push } = setup();
      window.onerror!('TypeError: x is null', 'http://app.com/main.js', 10, 5, new Error('x is null'));
      expect(push).toHaveBeenCalledTimes(1);
    });

    it('event has type = crash', () => {
      const { pushed } = setup();
      window.onerror!('TypeError', 'main.js', 1, 1, new Error('TypeError'));
      expect(pushed[0].type).toBe('crash');
    });

    it('event value is the error message', () => {
      const { pushed } = setup();
      window.onerror!('Cannot read property id', 'main.js', 1, 1, new Error('Cannot read property id'));
      expect(pushed[0].value).toBe('Cannot read property id');
    });

    it('truncates message to 500 chars', () => {
      const { pushed } = setup();
      const longMsg = 'x'.repeat(600);
      window.onerror!(longMsg, 'main.js', 1, 1, new Error(longMsg));
      expect(pushed[0].value!.length).toBe(500);
    });

    it('extracts filename from source URL', () => {
      const { pushed } = setup();
      window.onerror!('err', 'https://app.com/static/js/app.chunk.js', 10, 5, new Error('err'));
      expect((pushed[0].metadata as Record<string, unknown>).filename).toBe('app.chunk.js');
    });

    it('sets metadata.error_type = onerror', () => {
      const { pushed } = setup();
      window.onerror!('err', 'main.js', 1, 1, new Error('err'));
      expect((pushed[0].metadata as Record<string, unknown>).error_type).toBe('onerror');
    });

    it('populates elapsed_ms from getElapsedMs()', () => {
      const { pushed } = setup();
      window.onerror!('err', 'main.js', 1, 1, new Error('err'));
      expect(pushed[0].elapsedMs).toBe(5000);
    });

    it('populates screenName from getCurrentScreen()', () => {
      const { pushed } = setup();
      window.onerror!('err', 'main.js', 1, 1, new Error('err'));
      expect(pushed[0].screenName).toBe('/checkout');
    });

    it('truncates stack to 5 lines', () => {
      const { pushed } = setup();
      const manyLines = Array.from({ length: 20 }, (_, i) => `  at fn${i} (app.js:${i}:1)`).join('\n');
      const err = new Error('stack test');
      err.stack = `Error: stack test\n${manyLines}`;
      window.onerror!('stack test', 'app.js', 1, 1, err);
      const stack = (pushed[0].metadata as Record<string, unknown>).stack as string;
      expect(stack.split('\n').length).toBeLessThanOrEqual(5);
    });

    it('handles missing error object gracefully', () => {
      const { push } = setup();
      expect(() => window.onerror!('bare error', 'main.js', 1, 1, undefined)).not.toThrow();
      expect(push).toHaveBeenCalledTimes(1);
    });

    it('does not suppress the error (returns false)', () => {
      setup();
      const result = window.onerror!('err', 'f.js', 1, 1, new Error('err'));
      expect(result).toBe(false);
    });
  });

  describe('unhandledrejection', () => {
    it('captures unhandledrejection and pushes a crash event', () => {
      const { push } = setup();
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('fetch failed')),
        reason: new Error('fetch failed'),
      });
      window.dispatchEvent(event);
      expect(push).toHaveBeenCalledTimes(1);
    });

    it('event has type = crash', () => {
      const { pushed } = setup();
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(),
        reason: new Error('boom'),
      });
      window.dispatchEvent(event);
      expect(pushed[0].type).toBe('crash');
    });

    it('event value is the rejection message', () => {
      const { pushed } = setup();
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(),
        reason: new Error('Network request failed'),
      });
      window.dispatchEvent(event);
      expect(pushed[0].value).toBe('Network request failed');
    });

    it('sets metadata.error_type = unhandledrejection', () => {
      const { pushed } = setup();
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(),
        reason: new Error('err'),
      });
      window.dispatchEvent(event);
      expect((pushed[0].metadata as Record<string, unknown>).error_type).toBe('unhandledrejection');
    });

    it('handles non-Error rejection reasons', () => {
      const { pushed } = setup();
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(),
        reason: 'string reason',
      });
      window.dispatchEvent(event);
      expect(pushed[0].value).toBe('string reason');
    });
  });

  describe('cleanup', () => {
    it('returns a detach function', () => {
      const { detach } = setup();
      expect(typeof detach).toBe('function');
    });

    it('removes window.onerror on detach', () => {
      const { detach } = setup();
      expect(window.onerror).not.toBeNull();
      detach();
      expect(window.onerror).toBeNull();
    });

    it('stops capturing unhandledrejection after detach', () => {
      const { push, detach } = setup();
      detach();
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(),
        reason: new Error('after detach'),
      });
      window.dispatchEvent(event);
      expect(push).not.toHaveBeenCalled();
    });
  });
});
