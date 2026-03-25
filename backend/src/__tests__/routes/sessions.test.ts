import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';

const mockDb = db as unknown as { query: jest.Mock };

const AUTH = { Authorization: 'Bearer dev-dashboard-token' };

const MOCK_SESSION = {
  id: 'sess-1',
  anonymous_id: 'anon-1',
  started_at: new Date().toISOString(),
  duration_ms: 60000,
  device_type: 'desktop',
  event_count: 12,
};

describe('GET /api/v1/sessions', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/sessions');
    expect(res.status).toBe(401);
  });

  it('returns paginated session list', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SESSION] } as any)
      .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any);

    const res = await request(app)
      .get('/api/v1/sessions')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
  });

  it('passes device filter to query', async () => {
    mockDb.query.mockResolvedValue({ rows: [] } as any);

    await request(app)
      .get('/api/v1/sessions?device=mobile')
      .set(AUTH);

    const query = mockDb.query.mock.calls[0][0] as string;
    expect(query).toMatch(/device_type/);
  });
});

describe('GET /api/v1/sessions/:id', () => {
  it('returns 404 when session not found', async () => {
    mockDb.query.mockResolvedValue({ rows: [] } as any);

    const res = await request(app)
      .get('/api/v1/sessions/nonexistent')
      .set(AUTH);

    expect(res.status).toBe(404);
  });

  it('returns session detail when found', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SESSION] } as any);

    const res = await request(app)
      .get('/api/v1/sessions/sess-1')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('sess-1');
  });
});
