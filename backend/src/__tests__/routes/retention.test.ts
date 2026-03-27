import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';
import { redis } from '../../db/redis';

const mockDb    = db    as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock };

const AUTH = { Authorization: 'Bearer dev-dashboard-token' };

const MOCK_SUMMARY = { total_users: '500', d1_pct: '40.0', d7_pct: '25.0', d30_pct: '12.0' };
const MOCK_COHORTS = [
  { cohort_week: '2024-01-01T00:00:00Z', total: '100', d1_pct: '42.0', d7_pct: '27.0', d30_pct: '14.0' },
];

beforeEach(() => {
  mockRedis.get.mockResolvedValue(null);
  mockRedis.set.mockResolvedValue('OK');
});

describe('GET /api/v1/analytics/retention', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/analytics/retention');
    expect(res.status).toBe(401);
  });

  it('returns { summary, cohorts } data shape', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY] })
      .mockResolvedValueOnce({ rows: MOCK_COHORTS });

    const res = await request(app).get('/api/v1/analytics/retention').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('cohorts');
  });

  it('summary has total_users, d1_pct, d7_pct, d30_pct', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/v1/analytics/retention').set(AUTH);

    expect(res.body.data.summary).toMatchObject({
      total_users: 500,
      d1_pct:      40.0,
      d7_pct:      25.0,
      d30_pct:     12.0,
    });
  });

  it('cohorts is an array (never null)', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/v1/analytics/retention').set(AUTH);

    expect(Array.isArray(res.body.data.cohorts)).toBe(true);
  });

  it('defaults days to 90', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY] })
      .mockResolvedValueOnce({ rows: [] });

    await request(app).get('/api/v1/analytics/retention').set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(expect.stringMatching(/:90$/));
  });

  it('respects custom days param', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY] })
      .mockResolvedValueOnce({ rows: [] });

    await request(app).get('/api/v1/analytics/retention?days=30').set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(expect.stringMatching(/:30$/));
  });

  it('clamps days to maximum 180', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY] })
      .mockResolvedValueOnce({ rows: [] });

    await request(app).get('/api/v1/analytics/retention?days=999').set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(expect.stringMatching(/:180$/));
  });

  it('serves cached response without hitting DB', async () => {
    const cached = {
      summary: { total_users: 100, d1_pct: 30, d7_pct: 20, d30_pct: 10 },
      cohorts: [],
    };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const res = await request(app).get('/api/v1/analytics/retention').set(AUTH);

    expect(res.status).toBe(200);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('returns 0 pcts when no users exist', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ total_users: '0', d1_pct: null, d7_pct: null, d30_pct: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/v1/analytics/retention').set(AUTH);

    expect(res.body.data.summary.total_users).toBe(0);
    expect(res.body.data.summary.d1_pct).toBe(0);
    expect(res.body.data.cohorts).toEqual([]);
  });
});
