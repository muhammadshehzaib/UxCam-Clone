import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';

const mockDb = db as unknown as { query: jest.Mock };
const AUTH   = { Authorization: 'Bearer dev-dashboard-token' };
const SEG_ID = 'seg-uuid-1';

const MOCK_SEGMENT = {
  id:         SEG_ID,
  project_id: '00000000-0000-0000-0000-000000000001',
  name:       'Mobile iOS',
  filters:    { device: 'mobile', os: 'iOS' },
  created_at: '2024-01-01T00:00:00Z',
};

// ── GET /api/v1/segments ──────────────────────────────────────────────────────

describe('GET /api/v1/segments', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/segments');
    expect(res.status).toBe(401);
  });

  it('returns list of segments', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    const res = await request(app).get('/api/v1/segments').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Mobile iOS');
  });

  it('returns empty array when no segments', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/segments').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ── POST /api/v1/segments ─────────────────────────────────────────────────────

describe('POST /api/v1/segments', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/v1/segments').send({ name: 'x', filters: {} });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/v1/segments').set(AUTH).send({ filters: { device: 'mobile' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when filters is missing', async () => {
    const res = await request(app).post('/api/v1/segments').set(AUTH).send({ name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when filters is an empty object', async () => {
    const res = await request(app).post('/api/v1/segments').set(AUTH).send({ name: 'Test', filters: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/filter/i);
  });

  it('returns 400 for empty name string', async () => {
    const res = await request(app).post('/api/v1/segments').set(AUTH).send({ name: '  ', filters: { device: 'mobile' } });
    expect(res.status).toBe(400);
  });

  it('returns 201 with created segment for valid data', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    const res = await request(app).post('/api/v1/segments').set(AUTH).send({
      name: 'Mobile iOS', filters: { device: 'mobile', os: 'iOS' },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Mobile iOS');
  });

  it('unknown filter keys are stripped before storage', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    await request(app).post('/api/v1/segments').set(AUTH).send({
      name: 'Test', filters: { device: 'mobile', badKey: 'bad' },
    });
    const stored = JSON.parse(mockDb.query.mock.calls[0][1][2]);
    expect(stored).not.toHaveProperty('badKey');
  });
});

// ── PUT /api/v1/segments/:id ──────────────────────────────────────────────────

describe('PUT /api/v1/segments/:id', () => {
  it('returns 400 for empty name', async () => {
    const res = await request(app).put(`/api/v1/segments/${SEG_ID}`).set(AUTH)
      .send({ name: '', filters: { os: 'iOS' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no valid filters', async () => {
    const res = await request(app).put(`/api/v1/segments/${SEG_ID}`).set(AUTH)
      .send({ name: 'X', filters: {} });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown segment id', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).put('/api/v1/segments/nonexistent').set(AUTH)
      .send({ name: 'X', filters: { os: 'iOS' } });
    expect(res.status).toBe(404);
  });

  it('returns 200 with updated segment', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ ...MOCK_SEGMENT, name: 'Updated' }] });
    const res = await request(app).put(`/api/v1/segments/${SEG_ID}`).set(AUTH)
      .send({ name: 'Updated', filters: { os: 'Android' } });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
  });
});

// ── DELETE /api/v1/segments/:id ───────────────────────────────────────────────

describe('DELETE /api/v1/segments/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete(`/api/v1/segments/${SEG_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown segment', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).delete('/api/v1/segments/nonexistent').set(AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 204 on successful deletion', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: SEG_ID }] });
    const res = await request(app).delete(`/api/v1/segments/${SEG_ID}`).set(AUTH);
    expect(res.status).toBe(204);
  });
});

// ── Sessions: new rageClick + browser filters ──────────────────────────────────

describe('GET /api/v1/sessions — new segment filters', () => {
  const MOCK_SESSION = {
    id: 'sess-1', anonymous_id: 'anon-1', started_at: new Date().toISOString(),
    duration_ms: 60000, device_type: 'mobile', event_count: 5, metadata: { rage_click: true },
  };

  it('rageClick=true adds metadata condition to query', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app).get('/api/v1/sessions?rageClick=true').set(AUTH);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/metadata->>'rage_click' = 'true'/);
  });

  it('rageClick omitted → no metadata condition in query', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app).get('/api/v1/sessions').set(AUTH);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).not.toMatch(/rage_click/);
  });

  it('browser param adds ILIKE condition to query', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app).get('/api/v1/sessions?browser=Chrome').set(AUTH);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/s.browser ILIKE/);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('Chrome');
  });

  it('browser omitted → no browser condition', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app).get('/api/v1/sessions').set(AUTH);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).not.toMatch(/s.browser ILIKE/);
  });

  it('returns filtered sessions with rageClick=true', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SESSION] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });
    const res = await request(app).get('/api/v1/sessions?rageClick=true').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
