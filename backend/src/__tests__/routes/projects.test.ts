import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { db } from '../../db/client';
import { config } from '../../config';

jest.mock('../../db/client', () => {
  const queryFn = jest.fn();
  const client  = { query: jest.fn(), release: jest.fn() };
  return { db: { query: queryFn, connect: jest.fn().mockResolvedValue(client), _client: client } };
});

const mockDb     = db as unknown as { query: jest.Mock; connect: jest.Mock; _client: { query: jest.Mock; release: jest.Mock } };
const mockClient = mockDb._client;

const USER_ID    = 'user-uuid';
const PROJECT_ID = 'proj-uuid';

const AUTH = { Authorization: 'Bearer dev-dashboard-token' };

function makeJwt(projectId = PROJECT_ID) {
  return jwt.sign(
    { sub: USER_ID, projectId, email: 'a@b.com' },
    config.dashboardJwtSecret,
    { expiresIn: '1h' }
  );
}

const MOCK_PROJECT = { id: PROJECT_ID, name: 'My App', api_key: 'key', role: 'admin', created_at: '' };

// ── GET /api/v1/projects ──────────────────────────────────────────────────────

describe('GET /api/v1/projects', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });

  it('returns list of projects with dev token', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_PROJECT] });
    const res = await request(app).get('/api/v1/projects').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('My App');
  });

  it('returns empty array when user has no projects', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/v1/projects').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns projects for a JWT-authenticated user', async () => {
    // First query: project lookup from JWT, second: listUserProjects
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: PROJECT_ID, name: 'My App', api_key: 'k' }] })
      .mockResolvedValueOnce({ rows: [MOCK_PROJECT] });

    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${makeJwt()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ── POST /api/v1/projects ─────────────────────────────────────────────────────

describe('POST /api/v1/projects', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/projects').send({ name: 'App' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/v1/projects').set(AUTH).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 for empty name', async () => {
    mockClient.query.mockClear();
    // service will throw INVALID_NAME before hitting DB
    const res = await request(app).post('/api/v1/projects').set(AUTH).send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('creates project and returns 201 with token', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: PROJECT_ID, name: 'New App', api_key: 'k', created_at: '' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined);

    const res = await request(app).post('/api/v1/projects').set(AUTH).send({ name: 'New App' });
    expect(res.status).toBe(201);
    expect(res.body.data.project.name).toBe('New App');
    expect(res.body.data.token).toBeTruthy();
  });
});

// ── POST /api/v1/projects/:id/switch ─────────────────────────────────────────

describe('POST /api/v1/projects/:id/switch', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/switch`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user does not have access', async () => {
    // dev token means user id = dev user, no membership
    mockDb.query.mockResolvedValue({ rows: [] }); // no membership found
    const res = await request(app)
      .post(`/api/v1/projects/other-proj/switch`)
      .set(AUTH);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  it('returns new token and project on successful switch', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_PROJECT] });
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/switch`)
      .set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.project.id).toBe(PROJECT_ID);
  });
});
