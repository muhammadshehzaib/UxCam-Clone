/**
 * RN Session Manager — AsyncStorage-backed session and anonymous ID persistence.
 * Falls back gracefully if AsyncStorage is unavailable.
 */

const SESSION_KEY   = '@uxclone_session_id';
const ANON_KEY      = '@uxclone_anon_id';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let _sessionId  = '';
let _anonId     = '';
let _startTime  = 0;

async function getStorage(): Promise<{ getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void> } | null> {
  try {
    // Dynamic require so the module doesn't hard-crash if AsyncStorage is absent
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return null;
  }
}

export async function initSession(appVersion?: string): Promise<{ sessionId: string; anonymousId: string }> {
  const storage = await getStorage();

  // Restore or create anonymousId
  let anonId: string | null = null;
  if (storage) {
    anonId = await storage.getItem(ANON_KEY).catch(() => null);
  }
  if (!anonId) {
    anonId = `anon_${uuid()}`;
    if (storage) await storage.setItem(ANON_KEY, anonId).catch(() => {});
  }

  // Always create a fresh session per app launch
  const sessionId = uuid();
  if (storage) await storage.setItem(SESSION_KEY, sessionId).catch(() => {});

  _sessionId = sessionId;
  _anonId    = anonId;
  _startTime = Date.now();

  return { sessionId, anonymousId: anonId };
}

export function getSessionId(): string   { return _sessionId; }
export function getAnonymousId(): string { return _anonId; }
export function getElapsedMs(): number   { return _startTime ? Date.now() - _startTime : 0; }

export function destroySession(): void {
  _sessionId = '';
  _anonId    = '';
  _startTime = 0;
}
