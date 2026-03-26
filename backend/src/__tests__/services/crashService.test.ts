import { db } from '../../db/client';
import { getCrashGroups, getCrashSessions } from '../../services/crashService';

const mockDb = db as unknown as { query: jest.Mock };

const PROJECT_ID = 'proj-1';

const MOCK_CRASH_ROWS = [
  {
    message:           'TypeError: Cannot read property id',
    filename:          'app.js',
    total_occurrences: '23',
    affected_sessions: '15',
    first_seen:        '2024-03-01T10:00:00Z',
    last_seen:         '2024-03-10T14:00:00Z',
  },
  {
    message:           'Network request failed',
    filename:          'api.js',
    total_occurrences: '12',
    affected_sessions: '8',
    first_seen:        '2024-03-02T09:00:00Z',
    last_seen:         '2024-03-09T11:00:00Z',
  },
];

const MOCK_SESSION_ROWS = [
  {
    id:               'sess-1',
    anonymous_id:     'anon-abc',
    external_id:      'user@example.com',
    started_at:       '2024-03-10T10:00:00Z',
    duration_ms:      120000,
    device_type:      'mobile',
    os:               'iOS',
    crash_elapsed_ms: 45000,
  },
  {
    id:               'sess-2',
    anonymous_id:     'anon-xyz',
    external_id:      null,
    started_at:       '2024-03-09T08:00:00Z',
    duration_ms:      90000,
    device_type:      'desktop',
    os:               'macOS',
    crash_elapsed_ms: 12000,
  },
];

// ── getCrashGroups ─────────────────────────────────────────────────────────────

describe('getCrashGroups', () => {
  it('returns crash groups ordered by affected_sessions', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_CRASH_ROWS });
    const result = await getCrashGroups(PROJECT_ID, 30);
    expect(result).toHaveLength(2);
    expect(result[0].message).toBe('TypeError: Cannot read property id');
  });

  it('parses occurrence and session counts as integers', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_CRASH_ROWS });
    const result = await getCrashGroups(PROJECT_ID, 30);
    expect(result[0].total_occurrences).toBe(23);
    expect(result[0].affected_sessions).toBe(15);
  });

  it('returns correct filename from metadata', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_CRASH_ROWS });
    const result = await getCrashGroups(PROJECT_ID, 30);
    expect(result[0].filename).toBe('app.js');
  });

  it('returns empty array when no crashes', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const result = await getCrashGroups(PROJECT_ID, 30);
    expect(result).toEqual([]);
  });

  it('queries only crash event type', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashGroups(PROJECT_ID, 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/type = 'crash'/);
  });

  it('filters by project_id', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashGroups(PROJECT_ID, 30);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(PROJECT_ID);
  });

  it('filters by timestamp using days param', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashGroups(PROJECT_ID, 7);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    const since = params[1] as Date;
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(7);
  });

  it('groups by message and filename', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashGroups(PROJECT_ID, 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/GROUP BY value/);
    expect(sql).toMatch(/metadata->>'filename'/);
  });

  it('includes first_seen and last_seen timestamps', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_CRASH_ROWS });
    const result = await getCrashGroups(PROJECT_ID, 30);
    expect(result[0].first_seen).toBe('2024-03-01T10:00:00Z');
    expect(result[0].last_seen).toBe('2024-03-10T14:00:00Z');
  });
});

// ── getCrashSessions ───────────────────────────────────────────────────────────

describe('getCrashSessions', () => {
  it('returns sessions with crash_elapsed_ms', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_SESSION_ROWS });
    const result = await getCrashSessions(PROJECT_ID, 'TypeError', undefined, 30);
    expect(result).toHaveLength(2);
    expect(result[0].crash_elapsed_ms).toBe(45000);
  });

  it('includes external_id when available', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_SESSION_ROWS });
    const result = await getCrashSessions(PROJECT_ID, 'TypeError', undefined, 30);
    expect(result[0].external_id).toBe('user@example.com');
    expect(result[1].external_id).toBeNull();
  });

  it('filters by crash message', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashSessions(PROJECT_ID, 'Network error', undefined, 30);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params[1]).toBe('Network error');
  });

  it('adds filename filter when provided', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashSessions(PROJECT_ID, 'TypeError', 'api.js', 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/metadata->>'filename'/);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('api.js');
  });

  it('omits filename filter when not provided', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashSessions(PROJECT_ID, 'TypeError', undefined, 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    // no filename clause
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).not.toContain('api.js');
    expect(sql).not.toMatch(/metadata->>'filename' = \$4/);
  });

  it('returns empty array when no affected sessions', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const result = await getCrashSessions(PROJECT_ID, 'Unknown error', undefined, 30);
    expect(result).toEqual([]);
  });

  it('joins app_users for external_id', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashSessions(PROJECT_ID, 'err', undefined, 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/LEFT JOIN app_users/);
  });

  it('returns earliest crash_elapsed_ms per session (DISTINCT ON + ORDER BY elapsed_ms ASC)', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashSessions(PROJECT_ID, 'err', undefined, 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/DISTINCT ON \(s\.id\)/);
    expect(sql).toMatch(/ORDER BY s\.id, e\.elapsed_ms ASC/);
  });
});
