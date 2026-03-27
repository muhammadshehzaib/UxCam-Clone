import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';

jest.mock('../../db/client', () => {
  const q = jest.fn();
  const client = { query: jest.fn(), release: jest.fn() };
  return { db: { query: q, connect: jest.fn().mockResolvedValue(client), _client: client } };
});

const mockDb     = db as unknown as { query: jest.Mock; connect: jest.Mock; _client: { query: jest.Mock; release: jest.Mock } };
const mockClient = mockDb._client;
const AUTH       = { Authorization: 'Bearer dev-dashboard-token' };

const PROJECT_ID   = '00000000-0000-0000-0000-000000000001';
const INVITE_TOKEN = 'test-token-abc';

const MOCK_MEMBER = { user_id: 'u1', email: 'alice@x.com', name: null, role: 'admin', joined_at: '' };
const MOCK_INVITE = { id: 'inv-1', email: 'bob@x.com', role: 'viewer', expires_at: new Date(Date.now() + 86400000).toISOString(), created_at: '', token: INVITE_TOKEN };
const INVITE_INFO = { id: 'inv-1', email: 'bob@x.com', role: 'viewer', project_name: 'Dev Project', invited_by: 'alice@x.com', expires_at: new Date(Date.now() + 86400000).toISOString(), accepted_at: null };

// ── GET /api/v1/projects/:id/members ─────────────────────────────────────────

describe('GET /api/v1/projects/:id/members', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/members`);
    expect(res.status).toBe(401);
  });

  it('returns members and invites', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_MEMBER] })
      .mockResolvedValueOnce({ rows: [MOCK_INVITE] });
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/members`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.members).toHaveLength(1);
    expect(res.body.data.invites).toHaveLength(1);
  });
});

// ── POST /api/v1/projects/:id/invites ─────────────────────────────────────────

describe('POST /api/v1/projects/:id/invites', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/invites`).send({ email: 'x@x.com' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is viewer (not admin)', async () => {
    // requireProjectAdmin check
    mockDb.query.mockResolvedValue({ rows: [{ role: 'viewer' }] });
    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/invites`).set(AUTH).send({ email: 'x@x.com' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when email is missing', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ role: 'admin' }] }); // requireProjectAdmin passes
    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/invites`).set(AUTH).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 for invalid email format', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ role: 'admin' }] });
    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/invites`).set(AUTH).send({ email: 'bad-email' });
    expect(res.status).toBe(400);
  });

  it('returns 201 with invite URL on success', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] }) // requireProjectAdmin
      .mockResolvedValueOnce({ rows: [] })                   // not a member
      .mockResolvedValueOnce({ rows: [] })                   // no existing invite
      .mockResolvedValueOnce({ rows: [MOCK_INVITE] });        // INSERT
    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/invites`).set(AUTH)
      .send({ email: 'bob@x.com', role: 'viewer' });
    expect(res.status).toBe(201);
    expect(res.body.data.invite_url).toBeTruthy();
  });

  it('returns 409 when invite already pending', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'existing' }] }); // existing invite
    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/invites`).set(AUTH)
      .send({ email: 'bob@x.com' });
    expect(res.status).toBe(409);
  });
});

// ── DELETE /api/v1/projects/:id/members/:userId ───────────────────────────────

describe('DELETE /api/v1/projects/:id/members/:userId', () => {
  it('returns 403 for viewer', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ role: 'viewer' }] });
    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}/members/u2`).set(AUTH);
    expect(res.status).toBe(403);
  });

  it('returns 204 on successful removal', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })  // requireProjectAdmin
      .mockResolvedValueOnce({ rows: [{ user_id: 'u2' }] }); // DELETE returns row
    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}/members/u2`).set(AUTH);
    expect(res.status).toBe(204);
  });
});

// ── GET /api/v1/invites/:token ────────────────────────────────────────────────

describe('GET /api/v1/invites/:token', () => {
  it('returns invite info without auth (public endpoint)', async () => {
    mockDb.query.mockResolvedValue({ rows: [INVITE_INFO] });
    const res = await request(app).get(`/api/v1/invites/${INVITE_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.data.project_name).toBe('Dev Project');
  });

  it('returns 404 for unknown token', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/invites/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 410 for expired invite', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ ...INVITE_INFO, expires_at: new Date(Date.now() - 1000).toISOString() }] });
    const res = await request(app).get(`/api/v1/invites/${INVITE_TOKEN}`);
    expect(res.status).toBe(410);
  });
});

// ── POST /api/v1/invites/:token/accept ───────────────────────────────────────

describe('POST /api/v1/invites/:token/accept', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`/api/v1/invites/${INVITE_TOKEN}/accept`);
    expect(res.status).toBe(401);
  });

  it('adds user to project and returns new token', async () => {
    // Dev token user is dev@uxclone.local, invite is for 'dev@uxclone.local'
    const devInviteInfo = { ...INVITE_INFO, email: 'dev@uxclone.local' };
    mockDb.query.mockResolvedValue({ rows: [devInviteInfo] });
    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined);
    const res = await request(app).post(`/api/v1/invites/${INVITE_TOKEN}/accept`).set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('returns 410 for expired invite', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ ...INVITE_INFO, expires_at: new Date(Date.now() - 1000).toISOString() }] });
    const res = await request(app).post(`/api/v1/invites/${INVITE_TOKEN}/accept`).set(AUTH);
    expect(res.status).toBe(410);
  });
});
