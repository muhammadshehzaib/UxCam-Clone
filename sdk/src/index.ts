import { SDKConfig, SDKEvent } from './types';
import { SessionManager } from './session';
import { Transport } from './transport';
import { attachRecorder } from './recorder';
import { attachErrorRecorder } from './errorRecorder';
import { attachFreezeRecorder } from './freezeRecorder';
import { attachNetworkRecorder } from './networkRecorder';

let session: SessionManager | null = null;
let transport: Transport | null = null;
let detachRecorder: (() => void) | null = null;
let detachErrorRecorder: (() => void) | null = null;
let detachFreezeRecorder: (() => void) | null = null;
let detachNetworkRecorder: (() => void) | null = null;
let currentScreen = '/';

function assertInitialized(): void {
  if (!session || !transport) {
    throw new Error('UXClone: call init() before using other methods');
  }
}

export const UXClone = {
  /**
   * Initialize the SDK. Call once, early in your app boot sequence.
   */
  init(config: SDKConfig): void {
    // Respect sample rate
    if (config.sampleRate !== undefined && config.sampleRate < 1) {
      if (Math.random() > config.sampleRate) return;
    }

    session = new SessionManager(config);
    transport = new Transport(
      config,
      () => session!.getSessionId(),
      () => session!.getAnonymousId()
    );

    // Send session start to API
    void session.sendSessionStart(config.endpoint);

    // Attach error recorder (before DOM recorder so crashes on init are caught)
    detachErrorRecorder = attachErrorRecorder(
      (event: SDKEvent) => {
        session!.touch();
        transport!.push(event);
      },
      () => session!.getElapsedMs(),
      () => currentScreen
    );

    // Attach network recorder — captures failed fetch/XHR (status ≥400)
    detachNetworkRecorder = attachNetworkRecorder(
      (event: SDKEvent) => {
        transport!.push(event);
      },
      () => session!.getElapsedMs(),
      () => currentScreen,
      config.endpoint
    );

    // Attach freeze recorder — detects main thread blocks ≥500ms
    detachFreezeRecorder = attachFreezeRecorder(
      (event: SDKEvent) => {
        transport!.push(event);
      },
      () => session!.getElapsedMs(),
      () => currentScreen
    );

    // Attach DOM recorder
    detachRecorder = attachRecorder(
      (event: SDKEvent) => {
        session!.touch();
        transport!.push(event);
      },
      () => session!.getElapsedMs(),
      () => currentScreen
    );

    // Start auto-flush
    transport.startAutoFlush();

    // Flush on page hide
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        transport!.flushSync();
      }
    });

    // Track initial screen
    currentScreen = window.location.pathname;
  },

  /**
   * Associate the current anonymous user with your app's user ID.
   */
  identify(userId: string, traits: Record<string, unknown> = {}): void {
    assertInitialized();

    fetch(`${(session as SessionManager & { config: SDKConfig }).config?.endpoint ?? ''}/api/v1/ingest/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymousId: session!.getAnonymousId(),
        apiKey: (session as unknown as { config: SDKConfig }).config?.apiKey,
        userId,
        traits,
      }),
    }).catch(() => {});
  },

  /**
   * Track a custom event.
   */
  track(eventName: string, metadata: Record<string, unknown> = {}): void {
    assertInitialized();
    session!.touch();
    transport!.push({
      type: 'custom',
      timestamp: Date.now(),
      elapsedMs: session!.getElapsedMs(),
      value: eventName,
      screenName: currentScreen,
      metadata,
    });
  },

  /**
   * Track a screen/page view (for SPAs — call on route change).
   */
  trackScreen(screenName: string, metadata: Record<string, unknown> = {}): void {
    assertInitialized();
    currentScreen = screenName;
    session!.touch();
    transport!.push({
      type: 'screen_view',
      timestamp: Date.now(),
      elapsedMs: session!.getElapsedMs(),
      screenName,
      metadata,
    });
  },

  /**
   * Manually flush all queued events.
   */
  flush(): Promise<void> {
    assertInitialized();
    return transport!.flush();
  },

  /**
   * Tear down the SDK (useful in tests or hot-reload scenarios).
   */
  destroy(): void {
    transport?.stopAutoFlush();
    transport?.flushSync();
    detachRecorder?.();
    detachErrorRecorder?.();
    detachFreezeRecorder?.();
    detachNetworkRecorder?.();
    session = null;
    transport = null;
    detachRecorder = null;
    detachErrorRecorder = null;
    detachFreezeRecorder = null;
    detachNetworkRecorder = null;
  },
};

export type { SDKConfig, SDKEvent } from './types';
