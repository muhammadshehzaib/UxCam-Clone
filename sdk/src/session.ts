import { SDKConfig, DeviceInfo, SessionStartPayload } from './types';

const ANON_ID_KEY = 'uxclone_anon_id';
const SESSION_ID_KEY = 'uxclone_session_id';
const SESSION_LAST_ACTIVE_KEY = 'uxclone_last_active';
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getPersistence() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function getItem(key: string): string | null {
  return getPersistence()?.getItem(key) ?? null;
}

function setItem(key: string, value: string): void {
  getPersistence()?.setItem(key, value);
}

function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent;
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;

  // Device type detection
  const isMobile = /Mobi|Android/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua) || (isMobile && screenWidth >= 768);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  // OS detection
  let os = 'Unknown';
  let osVersion = '';
  if (/Windows NT ([\d.]+)/.test(ua)) { os = 'Windows'; osVersion = RegExp.$1; }
  else if (/Mac OS X ([\d_]+)/.test(ua)) { os = 'macOS'; osVersion = RegExp.$1.replace(/_/g, '.'); }
  else if (/Android ([\d.]+)/.test(ua)) { os = 'Android'; osVersion = RegExp.$1; }
  else if (/iPhone OS ([\d_]+)/.test(ua)) { os = 'iOS'; osVersion = RegExp.$1.replace(/_/g, '.'); }
  else if (/Linux/.test(ua)) { os = 'Linux'; }

  // Browser detection
  let browser = 'Unknown';
  let browserVersion = '';
  if (/Edg\/([\d.]+)/.test(ua)) { browser = 'Edge'; browserVersion = RegExp.$1; }
  else if (/Chrome\/([\d.]+)/.test(ua)) { browser = 'Chrome'; browserVersion = RegExp.$1; }
  else if (/Firefox\/([\d.]+)/.test(ua)) { browser = 'Firefox'; browserVersion = RegExp.$1; }
  else if (/Safari\/([\d.]+)/.test(ua) && !/Chrome/.test(ua)) { browser = 'Safari'; browserVersion = RegExp.$1; }

  return { type: deviceType, os, osVersion, browser, browserVersion, appVersion: '', screenWidth, screenHeight };
}

export class SessionManager {
  private sessionId: string;
  private anonymousId: string;
  private startedAt: number;
  public config: SDKConfig;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: SDKConfig) {
    this.config = config;

    // Persist anonymousId across sessions
    let anonId = getItem(ANON_ID_KEY);
    if (!anonId) {
      anonId = generateUUID();
      setItem(ANON_ID_KEY, anonId);
    }
    this.anonymousId = anonId;

    // Start a new session or resume an existing one
    const existingSessionId = getItem(SESSION_ID_KEY);
    const lastActive = parseInt(getItem(SESSION_LAST_ACTIVE_KEY) ?? '0', 10);
    const isExpired = Date.now() - lastActive > SESSION_EXPIRY_MS;

    if (existingSessionId && !isExpired) {
      this.sessionId = existingSessionId;
      this.startedAt = lastActive;
    } else {
      this.sessionId = generateUUID();
      this.startedAt = Date.now();
      setItem(SESSION_ID_KEY, this.sessionId);
    }

    this.resetInactivityTimer();
    this.setupUnloadHandler();
  }

  getSessionId(): string { return this.sessionId; }
  getAnonymousId(): string { return this.anonymousId; }
  getStartedAt(): number { return this.startedAt; }
  getElapsedMs(): number { return Date.now() - this.startedAt; }

  touch(): void {
    setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
    this.resetInactivityTimer();
  }

  async sendSessionStart(endpoint: string): Promise<void> {
    const device = detectDevice();
    device.appVersion = this.config.appVersion ?? '';

    const payload: SessionStartPayload = {
      sessionId: this.sessionId,
      anonymousId: this.anonymousId,
      apiKey: this.config.apiKey,
      startedAt: this.startedAt,
      device,
    };

    try {
      await fetch(`${endpoint}/api/v1/ingest/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Non-fatal: session will still be created on first batch ingest
    }
  }

  sendSessionEnd(endpoint: string): void {
    const payload = {
      sessionId: this.sessionId,
      apiKey: this.config.apiKey,
      endedAt: Date.now(),
    };

    // Use sendBeacon for reliability during page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        `${endpoint}/api/v1/ingest/session/end`,
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      );
    } else {
      fetch(`${endpoint}/api/v1/ingest/session/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      // Session expired — rotate session ID on next interaction
      setItem(SESSION_ID_KEY, '');
      setItem(SESSION_LAST_ACTIVE_KEY, '0');
    }, SESSION_EXPIRY_MS);
  }

  private setupUnloadHandler(): void {
    const handler = () => this.sendSessionEnd(this.config.endpoint);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handler();
    });
    window.addEventListener('beforeunload', handler);
  }
}
