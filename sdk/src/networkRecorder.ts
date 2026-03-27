import { SDKEvent } from './types';

type EventQueueFn = (event: SDKEvent) => void;

/** Strip query params + fragment to avoid capturing sensitive tokens in URLs */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

/** Do not capture calls to the SDK's own ingest endpoint — prevents infinite loops */
function shouldCapture(url: string, sdkEndpoint: string): boolean {
  const clean = sanitizeUrl(url);
  return !clean.startsWith(sdkEndpoint);
}

/**
 * Monkey-patches window.fetch and XMLHttpRequest to capture failed network
 * requests (HTTP status ≥400 or network errors). Returns a cleanup function
 * that restores the originals.
 */
export function attachNetworkRecorder(
  push: EventQueueFn,
  getElapsedMs: () => number,
  getCurrentScreen: () => string,
  sdkEndpoint: string
): () => void {
  // ── Patch fetch ──────────────────────────────────────────────────────────────
  const originalFetch = window.fetch;

  window.fetch = async function (input, init) {
    const url    = typeof input === 'string' ? input : (input as Request).url;
    const method = ((init?.method ?? (input instanceof Request ? input.method : 'GET')) as string).toUpperCase();
    const start  = getElapsedMs();

    try {
      const response = await originalFetch.call(this, input, init);
      if (response.status >= 400 && shouldCapture(url, sdkEndpoint)) {
        push({
          type:       'network',
          timestamp:  Date.now(),
          elapsedMs:  start,
          screenName: getCurrentScreen(),
          value:      String(response.status),
          metadata: {
            url:         sanitizeUrl(url),
            method,
            status:      response.status,
            duration_ms: getElapsedMs() - start,
          },
        });
      }
      return response;
    } catch (err) {
      if (shouldCapture(url, sdkEndpoint)) {
        push({
          type:       'network',
          timestamp:  Date.now(),
          elapsedMs:  start,
          screenName: getCurrentScreen(),
          value:      '0',
          metadata: {
            url:         sanitizeUrl(url),
            method,
            status:      0,
            error:       'network_error',
            duration_ms: getElapsedMs() - start,
          },
        });
      }
      throw err;
    }
  };

  // ── Patch XMLHttpRequest ─────────────────────────────────────────────────────
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
    (this as XMLHttpRequest & Record<string, unknown>)._ux_method = method.toUpperCase();
    (this as XMLHttpRequest & Record<string, unknown>)._ux_url    = String(url);
    (this as XMLHttpRequest & Record<string, unknown>)._ux_start  = getElapsedMs();
    // eslint-disable-next-line prefer-rest-params
    return originalOpen.apply(this, arguments as unknown as Parameters<typeof originalOpen>);
  };

  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('loadend', () => {
      const meta = this as XMLHttpRequest & Record<string, unknown>;
      const url  = String(meta._ux_url ?? '');
      if ((this.status >= 400 || this.status === 0) && shouldCapture(url, sdkEndpoint)) {
        push({
          type:       'network',
          timestamp:  Date.now(),
          elapsedMs:  (meta._ux_start as number) ?? getElapsedMs(),
          screenName: getCurrentScreen(),
          value:      String(this.status),
          metadata: {
            url:         sanitizeUrl(url),
            method:      String(meta._ux_method ?? 'GET'),
            status:      this.status,
            duration_ms: getElapsedMs() - ((meta._ux_start as number) ?? 0),
          },
        });
      }
    });
    // eslint-disable-next-line prefer-rest-params
    return originalSend.apply(this, arguments as unknown as Parameters<typeof originalSend>);
  };

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  return () => {
    window.fetch                     = originalFetch;
    XMLHttpRequest.prototype.open    = originalOpen;
    XMLHttpRequest.prototype.send    = originalSend;
  };
}
