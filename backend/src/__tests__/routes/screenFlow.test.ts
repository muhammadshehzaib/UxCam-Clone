import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';
import { redis } from '../../db/redis';

const mockDb    = db    as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock };

const AUTH = { Authorization: 'Bearer dev-dashboard-token' };

const MOCK_EDGES = [
  { from_screen: '/home', to_screen: '/products', transition_count: '562' },
];
const MOCK_NODES = [
  { screen_name: '/home', total_visits: '1000', entry_count: '600', exit_count: '50' },
];

beforeEach(() => {
  mockRedis.get.mockResolvedValue(null);
  mockRedis.set.mockResolvedValue('OK');
});

describe('GET /api/v1/analytics/screen-flow', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/analytics/screen-flow');
    expect(res.status).toBe(401);
  });

  it('returns edges and nodes with correct shape', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: MOCK_EDGES })
      .mockResolvedValueOnce({ rows: MOCK_NODES });

    const res = await request(app).get('/api/v1/analytics/screen-flow').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('edges');
    expect(res.body.data).toHaveProperty('nodes');
    expect(res.body.data).toHaveProperty('total_transitions');
  });

  it('edges and nodes are arrays (never null)', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/api/v1/analytics/screen-flow').set(AUTH);

    expect(Array.isArray(res.body.data.edges)).toBe(true);
    expect(Array.isArray(res.body.data.nodes)).toBe(true);
  });

  it('returns empty arrays when no navigation events', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/api/v1/analytics/screen-flow').set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.edges).toEqual([]);
    expect(res.body.data.nodes).toEqual([]);
    expect(res.body.data.total_transitions).toBe(0);
  });

  it('defaults days to 30', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await request(app).get('/api/v1/analytics/screen-flow').set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(expect.stringMatching(/:30$/));
  });

  it('respects custom days param', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await request(app).get('/api/v1/analytics/screen-flow?days=7').set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(expect.stringMatching(/:7$/));
  });

  it('clamps days to maximum 90', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await request(app).get('/api/v1/analytics/screen-flow?days=999').set(AUTH);

    expect(mockRedis.get).toHaveBeenCalledWith(expect.stringMatching(/:90$/));
  });

  it('serves cached data without hitting DB', async () => {
    const cached = { edges: MOCK_EDGES, nodes: MOCK_NODES, total_transitions: 562 };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const res = await request(app).get('/api/v1/analytics/screen-flow').set(AUTH);

    expect(res.status).toBe(200);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('parses edge transition_count as number in response', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: MOCK_EDGES })
      .mockResolvedValueOnce({ rows: MOCK_NODES });

    const res = await request(app).get('/api/v1/analytics/screen-flow').set(AUTH);

    expect(typeof res.body.data.edges[0].transition_count).toBe('number');
  });
});
