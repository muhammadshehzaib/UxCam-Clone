import { RNEvent } from './types';

type PushFn = (event: RNEvent) => void;

const MAX_MESSAGE = 500;
const MAX_STACK   = 5;

function sanitizeStack(stack: string | undefined): string {
  if (!stack) return '';
  return stack.split('\n').slice(0, MAX_STACK).join('\n');
}

/**
 * Attach global JS error handler for React Native using ErrorUtils.
 * Falls back gracefully if ErrorUtils is not available.
 */
export function attachRNCrashRecorder(
  push:         PushFn,
  getElapsedMs: () => number,
  getCurrentScreen: () => string
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ErrorUtils = (global as any).ErrorUtils;
  if (!ErrorUtils) return () => {};

  const previousHandler = ErrorUtils.getGlobalHandler?.() ?? null;

  const handler = (error: Error, isFatal: boolean) => {
    push({
      type:       'crash',
      timestamp:  Date.now(),
      elapsedMs:  getElapsedMs(),
      screenName: getCurrentScreen(),
      value:      (error?.message ?? 'Unknown error').slice(0, MAX_MESSAGE),
      metadata: {
        stack:      sanitizeStack(error?.stack),
        is_fatal:   isFatal,
        error_type: 'react_native',
      },
    });

    // Chain to previous handler
    if (typeof previousHandler === 'function') {
      previousHandler(error, isFatal);
    }
  };

  ErrorUtils.setGlobalHandler(handler);

  // Also catch unhandled promise rejections
  const rejectionHandler = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const msg    = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection');
    push({
      type:       'crash',
      timestamp:  Date.now(),
      elapsedMs:  getElapsedMs(),
      screenName: getCurrentScreen(),
      value:      msg.slice(0, MAX_MESSAGE),
      metadata:   { stack: sanitizeStack(reason?.stack), error_type: 'unhandledrejection' },
    });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', rejectionHandler);
  }

  return () => {
    if (previousHandler !== null) {
      ErrorUtils.setGlobalHandler(previousHandler);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', rejectionHandler);
    }
  };
}
