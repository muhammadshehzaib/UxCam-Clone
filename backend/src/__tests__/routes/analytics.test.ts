import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';
import { redis } from '../../db/redis';

const mockDb = db as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock; hset: jest.Mock; expire: jest.Mock; del: jest.Mock; incr: jest.Mock };

const AUTH = { Authorization: 'Bearer dev-dashboard-token' };

describe('GET /api/v1/analytics/summary', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/analytics/summary');
    expect(res.status).toBe(401);
  });

  it('returns cached summary when cache is warm', async () => {
    const cached = {
      totalUsers: 50,
      totalSessions: 200,
      avgSessionDurationMs: 75000,
      topEvents: [],
      topScreens: [],
    };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const res = await request(app)
      .get('/api/v1/analytics/summary')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.totalUsers).toBe(50);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('queries Postgres and returns summary when cache is cold', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ total_sessions: '200', avg_duration_ms: '75000' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '50' }] } as any);

    const res = await request(app)
      .get('/api/v1/analytics/summary')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.totalSessions).toBe(200);
  });

  it('respects ?days query param (clamped to 1–90)', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockDb.query.mockResolvedValue({ rows: [{ total_sessions: '0', avg_duration_ms: '0', total: '0' }] } as any);

    await request(app).get('/api/v1/analytics/summary?days=7').set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(expect.stringContaining(':7'));
  });
});

describe('GET /api/v1/analytics/sessions-over-time', () => {
  it('returns sessions grouped by date', async () => {
    mockDb.query.mockResolvedValue({
      rows: [
        { date: '2024-01-01', count: '10' },
        { date: '2024-01-02', count: '20' },
      ],
    } as any);

    const res = await request(app)
      .get('/api/v1/analytics/sessions-over-time')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({ date: '2024-01-01', count: 10 });
  });
});
