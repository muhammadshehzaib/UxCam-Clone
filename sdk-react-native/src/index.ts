/**
 * UXClone React Native SDK
 *
 * Usage:
 *   import { UXCloneRN } from '@uxclone/react-native';
 *
 *   UXCloneRN.init({ apiKey: 'proj_xxx', endpoint: 'https://api.uxclone.app' });
 *
 *   // In your NavigationContainer:
 *   <NavigationContainer onStateChange={UXCloneRN.onNavigationStateChange}>
 */

import { RNSDKConfig, RNEvent, RNDeviceInfo } from './types';
import { initSession, getSessionId, getAnonymousId, getElapsedMs, destroySession } from './session';
import { RNTransport } from './transport';
import { attachRNCrashRecorder } from './crashRecorder';
import { attachRNNetworkRecorder } from './networkRecorder';

let transport:         RNTransport | null = null;
let detachCrash:       (() => void) | null = null;
let detachNetwork:     (() => void) | null = null;
let currentScreen      = 'App';
let initialized        = false;

function assertInitialized(): void {
  if (!initialized || !transport) {
    throw new Error('UXCloneRN: call init() before using other methods');
  }
}

function push(event: RNEvent): void {
  transport?.push(event);
}

/** Detect basic device info from React Native environment. */
function detectDeviceInfo(config: RNSDKConfig): RNDeviceInfo {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform, Dimensions } = require('react-native');
    const { width, height } = Dimensions.get('screen');
    return {
      type:           width < 768 ? 'mobile' : 'tablet',
      os:             Platform.OS === 'ios' ? 'ios' : 'android',
      osVersion:      String(Platform.Version),
      model:          'Unknown',
      appVersion:     config.appVersion ?? '1.0.0',
      screenWidth:    Math.round(width),
      screenHeight:   Math.round(height),
      browser:        '',
      browserVersion: '',
    };
  } catch {
    return {
      type: 'mobile', os: 'ios', osVersion: 'unknown',
      model: 'Unknown', appVersion: config.appVersion ?? '1.0.0',
      screenWidth: 390, screenHeight: 844,
      browser: '', browserVersion: '',
    };
  }
}

export const UXCloneRN = {
  /**
   * Initialize the SDK. Call once in your Application entry point.
   */
  async init(config: RNSDKConfig): Promise<void> {
    if (config.sampleRate !== undefined && config.sampleRate < 1) {
      if (Math.random() > config.sampleRate) return;
    }

    const { sessionId, anonymousId } = await initSession(config.appVersion);
    transport = new RNTransport(config, getSessionId, getAnonymousId);

    // Send session start
    const device = detectDeviceInfo(config);
    fetch(`${config.endpoint}/api/v1/ingest/session/start`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId, anonymousId, apiKey: config.apiKey, startedAt: Date.now(), device }),
    }).catch(() => {});

    // Attach crash recorder
    detachCrash = attachRNCrashRecorder(push, getElapsedMs, () => currentScreen);

    // Attach network recorder
    detachNetwork = attachRNNetworkRecorder(push, getElapsedMs, () => currentScreen, config.endpoint);

    // Flush when app goes to background
    try {
      const { AppState } = require('react-native');
      AppState.addEventListener('change', (state: string) => {
        if (state !== 'active') transport?.flushSync();
      });
    } catch { /* AppState not available */ }

    transport.startAutoFlush();
    initialized = true;
  },

  /**
   * Track a custom event (e.g. 'add_to_cart', 'checkout').
   */
  track(eventName: string, metadata: Record<string, unknown> = {}): void {
    assertInitialized();
    push({
      type:       'custom',
      timestamp:  Date.now(),
      elapsedMs:  getElapsedMs(),
      screenName: currentScreen,
      value:      eventName,
      metadata,
    });
  },

  /**
   * Track a screen view. Call on every navigation change.
   */
  trackScreen(screenName: string, metadata: Record<string, unknown> = {}): void {
    assertInitialized();
    currentScreen = screenName;
    push({
      type:       'screen_view',
      timestamp:  Date.now(),
      elapsedMs:  getElapsedMs(),
      screenName,
      metadata,
    });
  },

  /**
   * Link an anonymous user to your app's user ID.
   */
  identify(userId: string, traits: Record<string, unknown> = {}): void {
    assertInitialized();
    const config = (transport as unknown as { config: RNSDKConfig }).config;
    fetch(`${config.endpoint}/api/v1/ingest/identify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ anonymousId: getAnonymousId(), apiKey: config.apiKey, userId, traits }),
    }).catch(() => {});
  },

  /**
   * Hook for React Navigation — call onStateChange to auto-track screens.
   *
   *   <NavigationContainer onStateChange={UXCloneRN.onNavigationStateChange}>
   */
  onNavigationStateChange(state: unknown): void {
    if (!initialized) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const routes = (state as any)?.routes;
      if (!routes?.length) return;
      const active = routes[routes.length - 1];
      const name   = active?.name ?? 'Unknown';
      UXCloneRN.trackScreen(name);
    } catch { /* ignore */ }
  },

  /**
   * Record a touch event (x/y normalized 0–1).
   * Call from a Pressable/TouchableOpacity wrapper or GestureHandler.
   */
  recordTouch(x: number, y: number, componentName?: string): void {
    if (!initialized) return;
    push({
      type:       'touch',
      timestamp:  Date.now(),
      elapsedMs:  getElapsedMs(),
      screenName: currentScreen,
      x,
      y,
      target:     componentName,
    } as RNEvent);
  },

  /** Flush queued events immediately. */
  async flush(): Promise<void> {
    assertInitialized();
    return transport!.flush();
  },

  /** Tear down the SDK. */
  async destroy(): Promise<void> {
    transport?.stopAutoFlush();
    transport?.flushSync();
    detachCrash?.();
    detachNetwork?.();

    if (initialized) {
      // End session
      try {
        const cfg = (transport as unknown as { config: RNSDKConfig }).config;
        await fetch(`${cfg.endpoint}/api/v1/ingest/session/end`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ sessionId: getSessionId(), apiKey: cfg.apiKey, endedAt: Date.now() }),
        });
      } catch { /* ignore */ }
    }

    transport     = null;
    detachCrash   = null;
    detachNetwork = null;
    initialized   = false;
    destroySession();
  },
};

export type { RNSDKConfig, RNEvent } from './types';
