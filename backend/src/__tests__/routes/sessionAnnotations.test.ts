import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';

const mockDb = db as unknown as { query: jest.Mock };
const AUTH   = { Authorization: 'Bearer dev-dashboard-token' };
const SESS   = '00000000-0000-0000-0000-000000000099';

describe('PATCH /api/v1/sessions/:id/note', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch(`/api/v1/sessions/${SESS}/note`).send({ note: 'x' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when note field is missing', async () => {
    const res = await request(app).patch(`/api/v1/sessions/${SESS}/note`).set(AUTH).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/note/i);
  });

  it('returns 200 and updates the note', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: SESS }] });
    const res = await request(app).patch(`/api/v1/sessions/${SESS}/note`).set(AUTH)
      .send({ note: 'broken payment flow' });
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });

  it('returns 404 for unknown session', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).patch(`/api/v1/sessions/nonexistent/note`).set(AUTH)
      .send({ note: 'test' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/sessions/:id/tags', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch(`/api/v1/sessions/${SESS}/tags`).send({ tags: [] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when tags is not an array', async () => {
    const res = await request(app).patch(`/api/v1/sessions/${SESS}/tags`).set(AUTH)
      .send({ tags: 'bug' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/array/i);
  });

  it('returns 200 and updates tags', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: SESS }] });
    const res = await request(app).patch(`/api/v1/sessions/${SESS}/tags`).set(AUTH)
      .send({ tags: ['bug', 'reviewed'] });
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });

  it('returns 200 with empty tags array (removes all tags)', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: SESS }] });
    const res = await request(app).patch(`/api/v1/sessions/${SESS}/tags`).set(AUTH)
      .send({ tags: [] });
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown session', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).patch(`/api/v1/sessions/nonexistent/tags`).set(AUTH)
      .send({ tags: [] });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/sessions/export.csv', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/sessions/export.csv');
    expect(res.status).toBe(401);
  });

  it('returns text/csv content-type', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/sessions/export.csv').set(AUTH);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('returns Content-Disposition attachment header', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/sessions/export.csv').set(AUTH);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['content-disposition']).toMatch(/sessions-/);
  });

  it('first line is the CSV header row', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/sessions/export.csv').set(AUTH);
    expect(res.text.split('\n')[0]).toContain('id');
    expect(res.text.split('\n')[0]).toContain('started_at');
  });
});

describe('GET /api/v1/users/export.csv', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/users/export.csv');
    expect(res.status).toBe(401);
  });

  it('returns text/csv content-type', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/users/export.csv').set(AUTH);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('first line is the CSV header row', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/users/export.csv').set(AUTH);
    const header = res.text.split('\n')[0];
    expect(header).toContain('id');
    expect(header).toContain('external_id');
    expect(header).toContain('session_count');
  });

  it('accepts search query param', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await request(app).get('/api/v1/users/export.csv?search=john').set(AUTH);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/ILIKE/);
  });
});
