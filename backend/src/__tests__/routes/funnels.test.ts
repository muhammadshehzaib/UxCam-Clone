import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';

const mockDb = db as unknown as { query: jest.Mock };
const AUTH = { Authorization: 'Bearer dev-dashboard-token' };

const MOCK_FUNNEL = {
  id: 'funnel-1',
  project_id: '00000000-0000-0000-0000-000000000001',
  name: 'Sign-up Flow',
  steps: [{ screen: '/home' }, { screen: '/signup' }],
  created_at: '2024-01-01T00:00:00Z',
};

// ── GET /api/v1/funnels ───────────────────────────────────────────────────────

describe('GET /api/v1/funnels', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/funnels');
    expect(res.status).toBe(401);
  });

  it('returns list of funnels', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_FUNNEL] });
    const res = await request(app).get('/api/v1/funnels').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Sign-up Flow');
  });

  it('returns empty array when no funnels', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/funnels').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ── POST /api/v1/funnels ──────────────────────────────────────────────────────

describe('POST /api/v1/funnels', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/v1/funnels').send({ name: 'x', steps: [] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/funnels')
      .set(AUTH)
      .send({ steps: [{ screen: '/a' }, { screen: '/b' }] });
    expect(res.status).toBe(400);
  });

  it('returns 400 when steps is missing', async () => {
    const res = await request(app)
      .post('/api/v1/funnels')
      .set(AUTH)
      .send({ name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when fewer than 2 steps', async () => {
    const res = await request(app)
      .post('/api/v1/funnels')
      .set(AUTH)
      .send({ name: 'Test', steps: [{ screen: '/home' }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2 steps/);
  });

  it('returns 400 when more than 10 steps', async () => {
    const steps = Array.from({ length: 11 }, (_, i) => ({ screen: `/s${i}` }));
    const res = await request(app)
      .post('/api/v1/funnels')
      .set(AUTH)
      .send({ name: 'Test', steps });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/10 steps/);
  });

  it('returns 400 when a step has empty screen name', async () => {
    const res = await request(app)
      .post('/api/v1/funnels')
      .set(AUTH)
      .send({ name: 'Test', steps: [{ screen: '/home' }, { screen: '' }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/screen name/);
  });

  it('creates funnel and returns 201 with funnel data', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_FUNNEL] });
    const res = await request(app)
      .post('/api/v1/funnels')
      .set(AUTH)
      .send({ name: 'Sign-up Flow', steps: [{ screen: '/home' }, { screen: '/signup' }] });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Sign-up Flow');
  });
});

// ── DELETE /api/v1/funnels/:id ────────────────────────────────────────────────

describe('DELETE /api/v1/funnels/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/v1/funnels/funnel-1');
    expect(res.status).toBe(401);
  });

  it('returns 204 on successful deletion', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: 'funnel-1' }] });
    const res = await request(app).delete('/api/v1/funnels/funnel-1').set(AUTH);
    expect(res.status).toBe(204);
  });

  it('returns 404 when funnel does not exist', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).delete('/api/v1/funnels/nonexistent').set(AUTH);
    expect(res.status).toBe(404);
  });
});

// ── GET /api/v1/funnels/:id/results ──────────────────────────────────────────

describe('GET /api/v1/funnels/:id/results', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/funnels/funnel-1/results');
    expect(res.status).toBe(401);
  });

  it('returns funnel results with step data', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_FUNNEL] })
      .mockResolvedValueOnce({ rows: [{ count_0: '100', count_1: '60' }] });

    const res = await request(app)
      .get('/api/v1/funnels/funnel-1/results')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.funnel.name).toBe('Sign-up Flow');
    expect(res.body.data.steps).toHaveLength(2);
    expect(res.body.data.steps[0].count).toBe(100);
    expect(res.body.data.steps[1].count).toBe(60);
  });

  it('returns 404 when funnel not found', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .get('/api/v1/funnels/nonexistent/results')
      .set(AUTH);
    expect(res.status).toBe(404);
  });

  it('defaults days to 30', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_FUNNEL] })
      .mockResolvedValueOnce({ rows: [{ count_0: '10', count_1: '5' }] });

    await request(app).get('/api/v1/funnels/funnel-1/results').set(AUTH);

    // Second query contains the days-based timestamp param
    const params = mockDb.query.mock.calls[1][1] as unknown[];
    const since = params[1] as Date;
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(30);
  });

  it('clamps days to max 90', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_FUNNEL] })
      .mockResolvedValueOnce({ rows: [{ count_0: '10', count_1: '5' }] });

    await request(app)
      .get('/api/v1/funnels/funnel-1/results?days=999')
      .set(AUTH);

    const params = mockDb.query.mock.calls[1][1] as unknown[];
    const since = params[1] as Date;
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(90);
  });
});
