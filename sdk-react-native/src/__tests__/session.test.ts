jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    default: {
      getItem:  jest.fn(async (k: string) => store[k] ?? null),
      setItem:  jest.fn(async (k: string, v: string) => { store[k] = v; }),
      removeItem: jest.fn(async (k: string) => { delete store[k]; }),
    },
  };
}, { virtual: true });

import { initSession, getSessionId, getAnonymousId, getElapsedMs, destroySession } from '../session';

afterEach(() => destroySession());

describe('RN Session', () => {
  it('generates a unique session ID on init', async () => {
    const { sessionId } = await initSession();
    expect(sessionId).toBeTruthy();
    expect(getSessionId()).toBe(sessionId);
  });

  it('generates and persists an anonymous ID', async () => {
    const { anonymousId } = await initSession();
    expect(anonymousId).toMatch(/^anon_/);
    expect(getAnonymousId()).toBe(anonymousId);
  });

  it('returns correct elapsedMs since session start', async () => {
    await initSession();
    await new Promise((r) => setTimeout(r, 50));
    expect(getElapsedMs()).toBeGreaterThanOrEqual(40);
  });

  it('destroySession resets state', async () => {
    await initSession();
    destroySession();
    expect(getSessionId()).toBe('');
    expect(getAnonymousId()).toBe('');
    expect(getElapsedMs()).toBe(0);
  });

  it('creates a fresh session ID on each init (not reused)', async () => {
    const { sessionId: id1 } = await initSession();
    destroySession();
    const { sessionId: id2 } = await initSession();
    expect(id1).not.toBe(id2);
  });
});
