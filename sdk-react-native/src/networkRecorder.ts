/**
 * RN Network Recorder — patches global fetch to capture failed requests.
 * Identical pattern to the web SDK networkRecorder.ts.
 */

import { RNEvent } from './types';

type PushFn = (event: RNEvent) => void;

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

function shouldCapture(url: string, endpoint: string): boolean {
  return !sanitizeUrl(url).startsWith(endpoint);
}

export function attachRNNetworkRecorder(
  push:          PushFn,
  getElapsedMs:  () => number,
  getCurrentScreen: () => string,
  sdkEndpoint:   string
): () => void {
  const originalFetch = global.fetch;

  global.fetch = async function (input, init) {
    const url    = typeof input === 'string' ? input : (input as Request).url;
    const method = ((init?.method ?? 'GET') as string).toUpperCase();
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
          metadata:   { url: sanitizeUrl(url), method, status: 0, error: 'network_error', duration_ms: getElapsedMs() - start },
        });
      }
      throw err;
    }
  } as typeof fetch;

  return () => { global.fetch = originalFetch; };
}
