import { SDKEvent } from './types';

type EventQueueFn = (event: SDKEvent) => void;

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LINES    = 5;
const MAX_STACK_LENGTH   = 1024;

/** Keep only the filename from a full URL or path (e.g. "/app/src/utils.ts" → "utils.ts") */
function extractFilename(source: string | undefined): string {
  if (!source) return 'unknown';
  return source.split('/').pop()?.split('?')[0] ?? 'unknown';
}

/** Truncate stack trace to first N lines and cap total length */
function sanitizeStack(stack: string | undefined): string {
  if (!stack) return '';
  const lines = stack.split('\n').slice(0, MAX_STACK_LINES).join('\n');
  return lines.length > MAX_STACK_LENGTH ? lines.slice(0, MAX_STACK_LENGTH) + '…' : lines;
}

/**
 * Attaches window.onerror and unhandledrejection listeners.
 * Pushes crash events into the SDK queue.
 * Returns a cleanup function.
 */
export function attachErrorRecorder(
  push: EventQueueFn,
  getElapsedMs: () => number,
  getCurrentScreen: () => string
): () => void {
  const onerrorHandler = (
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ) => {
    const msg = typeof message === 'string' ? message : String(message);

    push({
      type:      'crash',
      timestamp: Date.now(),
      elapsedMs: getElapsedMs(),
      screenName: getCurrentScreen(),
      value: msg.slice(0, MAX_MESSAGE_LENGTH),
      metadata: {
        stack:      sanitizeStack(error?.stack),
        filename:   extractFilename(source),
        line:       lineno ?? 0,
        col:        colno  ?? 0,
        error_type: 'onerror',
      },
    });

    return false; // do not suppress the error
  };

  const rejectionHandler = (event: PromiseRejectionEvent) => {
    const reason   = event.reason;
    const msg      = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection');
    const stack    = reason instanceof Error ? reason.stack : undefined;

    push({
      type:      'crash',
      timestamp: Date.now(),
      elapsedMs: getElapsedMs(),
      screenName: getCurrentScreen(),
      value: msg.slice(0, MAX_MESSAGE_LENGTH),
      metadata: {
        stack:      sanitizeStack(stack),
        filename:   extractFilename(stack?.split('\n')[1]),
        line:       0,
        col:        0,
        error_type: 'unhandledrejection',
      },
    });
  };

  // Save previous handler so we don't break Sentry, Datadog, or any existing onerror
  const previousOnError = window.onerror;

  window.onerror = (message, source, lineno, colno, error) => {
    onerrorHandler(message, source, lineno, colno, error);
    if (typeof previousOnError === 'function') {
      return previousOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  window.addEventListener('unhandledrejection', rejectionHandler);

  return () => {
    window.onerror = previousOnError; // restore, not null
    window.removeEventListener('unhandledrejection', rejectionHandler);
  };
}
