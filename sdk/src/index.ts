import { SDKConfig, SDKEvent } from './types';
import { SessionManager } from './session';
import { Transport } from './transport';
import { attachRecorder } from './recorder';

let session: SessionManager | null = null;
let transport: Transport | null = null;
let detachRecorder: (() => void) | null = null;
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
    session = null;
    transport = null;
    detachRecorder = null;
  },
};

export type { SDKConfig, SDKEvent } from './types';
