import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';
import { redis } from '../../db/redis';

const mockDb = db as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock };

const AUTH = { Authorization: 'Bearer dev-dashboard-token' };

const MOCK_HEATMAP_ROWS = [
  { x: '0.50', y: '0.30', count: '12' },
  { x: '0.80', y: '0.10', count: '5'  },
];

describe('GET /api/v1/analytics/heatmap', () => {
  beforeEach(() => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/analytics/heatmap?screen=/home');
    expect(res.status).toBe(401);
  });

  it('returns 400 when screen param is missing', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/heatmap')
      .set(AUTH);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/screen/);
  });

  it('returns heatmap points for valid screen', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_HEATMAP_ROWS });

    const res = await request(app)
      .get('/api/v1/analytics/heatmap?screen=/home')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ x: 0.5, y: 0.3, count: 12 });
  });

  it('returns empty array when no clicks for screen', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/v1/analytics/heatmap?screen=/unknown')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('serves cached response on cache hit', async () => {
    const cached = [{ x: 0.5, y: 0.3, count: 12 }];
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const res = await request(app)
      .get('/api/v1/analytics/heatmap?screen=/home')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(cached);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('defaults days to 30 when not provided', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await request(app)
      .get('/api/v1/analytics/heatmap?screen=/home')
      .set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(
      expect.stringMatching(/:30$/)
    );
  });

  it('respects custom days param', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await request(app)
      .get('/api/v1/analytics/heatmap?screen=/home&days=7')
      .set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(
      expect.stringMatching(/:7$/)
    );
  });

  it('clamps days to maximum 90', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await request(app)
      .get('/api/v1/analytics/heatmap?screen=/home&days=999')
      .set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(
      expect.stringMatching(/:90$/)
    );
  });
});

describe('GET /api/v1/analytics/screens', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/analytics/screens');
    expect(res.status).toBe(401);
  });

  it('returns list of distinct screen names', async () => {
    mockDb.query.mockResolvedValue({
      rows: [
        { screen_name: '/checkout' },
        { screen_name: '/home' },
        { screen_name: '/profile' },
      ],
    });

    const res = await request(app)
      .get('/api/v1/analytics/screens')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(['/checkout', '/home', '/profile']);
  });

  it('returns empty array when no screens recorded', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get('/api/v1/analytics/screens')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
