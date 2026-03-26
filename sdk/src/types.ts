export type EventType =
  | 'click'
  | 'scroll'
  | 'input'
  | 'navigate'
  | 'screen_view'
  | 'custom'
  | 'crash';

export interface SDKEvent {
  type: EventType;
  timestamp: number;   // Unix ms
  elapsedMs: number;   // ms since session start (drives replay)
  x?: number;          // normalized 0–1 (pointer events only)
  y?: number;
  target?: string;     // sanitized CSS selector
  screenName?: string; // current route
  value?: string;      // scroll delta, custom event name, etc.
  metadata?: Record<string, unknown>;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  appVersion: string;
  screenWidth: number;
  screenHeight: number;
}

export interface SessionStartPayload {
  sessionId: string;
  anonymousId: string;
  apiKey: string;
  startedAt: number;
  device: DeviceInfo;
}

export interface BatchPayload {
  sessionId: string;
  anonymousId: string;
  apiKey: string;
  events: SDKEvent[];
}

export interface IdentifyPayload {
  anonymousId: string;
  apiKey: string;
  userId: string;
  traits: Record<string, unknown>;
}

export interface SDKConfig {
  apiKey: string;
  endpoint: string;
  flushInterval?: number;   // ms, default 5000
  maxBatchSize?: number;    // default 50
  sampleRate?: number;      // 0–1, default 1.0
  appVersion?: string;
}
