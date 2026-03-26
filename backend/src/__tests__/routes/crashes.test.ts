import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';

const mockDb = db as unknown as { query: jest.Mock };
const AUTH   = { Authorization: 'Bearer dev-dashboard-token' };

const MOCK_CRASH_ROWS = [
  {
    message:           'TypeError: x is null',
    filename:          'app.js',
    total_occurrences: '10',
    affected_sessions: '6',
    first_seen:        '2024-03-01T00:00:00Z',
    last_seen:         '2024-03-05T00:00:00Z',
  },
];

const MOCK_SESSION_ROWS = [
  {
    id:               'sess-1',
    anonymous_id:     'anon-1',
    external_id:      null,
    started_at:       '2024-03-05T10:00:00Z',
    duration_ms:      60000,
    device_type:      'mobile',
    os:               'iOS',
    crash_elapsed_ms: 15000,
  },
];

// ── GET /api/v1/analytics/crashes ─────────────────────────────────────────────

describe('GET /api/v1/analytics/crashes', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/analytics/crashes');
    expect(res.status).toBe(401);
  });

  it('returns crash groups', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_CRASH_ROWS });
    const res = await request(app).get('/api/v1/analytics/crashes').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].message).toBe('TypeError: x is null');
    expect(res.body.data[0].total_occurrences).toBe(10);
    expect(res.body.data[0].affected_sessions).toBe(6);
  });

  it('returns empty array when no crashes', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/analytics/crashes').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('defaults days to 30', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app).get('/api/v1/analytics/crashes').set(AUTH);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    const since = params[1] as Date;
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(30);
  });

  it('respects custom days param', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app).get('/api/v1/analytics/crashes?days=7').set(AUTH);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    const since = params[1] as Date;
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(7);
  });

  it('clamps days to maximum 90', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app).get('/api/v1/analytics/crashes?days=999').set(AUTH);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    const since = params[1] as Date;
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(90);
  });
});

// ── GET /api/v1/analytics/crashes/sessions ────────────────────────────────────

describe('GET /api/v1/analytics/crashes/sessions', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/analytics/crashes/sessions?message=err');
    expect(res.status).toBe(401);
  });

  it('returns 400 when message param is missing', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/crashes/sessions')
      .set(AUTH);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/);
  });

  it('returns sessions for a given message', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_SESSION_ROWS });
    const res = await request(app)
      .get('/api/v1/analytics/crashes/sessions?message=TypeError')
      .set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].crash_elapsed_ms).toBe(15000);
  });

  it('returns empty array when no sessions found', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .get('/api/v1/analytics/crashes/sessions?message=unknown')
      .set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('passes optional filename filter to service', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app)
      .get('/api/v1/analytics/crashes/sessions?message=err&filename=app.js')
      .set(AUTH);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('app.js');
  });

  it('defaults days to 30 when not provided', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app)
      .get('/api/v1/analytics/crashes/sessions?message=err')
      .set(AUTH);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    const since = params[2] as Date;
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(30);
  });

  it('clamps days to maximum 90', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app)
      .get('/api/v1/analytics/crashes/sessions?message=err&days=999')
      .set(AUTH);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    const since = params[2] as Date;
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(90);
  });
});
