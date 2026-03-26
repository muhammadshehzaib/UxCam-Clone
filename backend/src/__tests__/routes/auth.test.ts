import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../app';
import { db } from '../../db/client';

// db mock with transaction support
jest.mock('../../db/client', () => {
  const queryFn = jest.fn();
  const client  = { query: jest.fn(), release: jest.fn() };
  return {
    db: {
      query:   queryFn,
      connect: jest.fn().mockResolvedValue(client),
      _client: client,
    },
  };
});

const mockDb     = db as unknown as { query: jest.Mock; connect: jest.Mock; _client: { query: jest.Mock; release: jest.Mock } };
const mockClient = mockDb._client;

const PROJECT_ID = 'proj-uuid';
const USER_ID    = 'user-uuid';
const HASH       = bcrypt.hashSync('password123', 1);

function setupRegisterMocks() {
  mockDb.query.mockResolvedValue({ rows: [] }); // no duplicate email
  mockClient.query
    .mockResolvedValueOnce(undefined)  // BEGIN
    .mockResolvedValueOnce({ rows: [{ id: PROJECT_ID, name: 'My App' }] })
    .mockResolvedValueOnce({ rows: [{ id: USER_ID, email: 'a@b.com', name: null, project_id: PROJECT_ID }] })
    .mockResolvedValueOnce(undefined); // COMMIT
}

// ── POST /api/v1/auth/register ────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('returns 201 with token and user for valid data', async () => {
    setupRegisterMocks();
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'a@b.com', password: 'password123', projectName: 'My App',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('a@b.com');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      password: 'password123', projectName: 'App',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'a@b.com', projectName: 'App',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when projectName is missing', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'a@b.com', password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/projectName/i);
  });

  it('returns 400 for invalid email format', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email', password: 'password123', projectName: 'App',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 for weak password', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'a@b.com', password: 'short', projectName: 'App',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it('returns 409 for duplicate email', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: USER_ID }] }); // existing user
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'a@b.com', password: 'password123', projectName: 'App',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  const MOCK_USER = { id: USER_ID, email: 'a@b.com', name: null, password_hash: HASH, project_id: PROJECT_ID };

  it('returns 200 with token for valid credentials', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_USER] });
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'a@b.com', password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_USER] });
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'a@b.com', password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid email or password/i);
  });

  it('returns 401 for unknown email', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nobody@b.com', password: 'password123',
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });
});

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user info for valid token', async () => {
    // First register to get a real token
    setupRegisterMocks();
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      email: 'a@b.com', password: 'password123', projectName: 'My App',
    });
    const { token } = registerRes.body.data;

    // Mock getMe query
    mockDb.query.mockResolvedValue({
      rows: [{ id: USER_ID, email: 'a@b.com', name: null, project_id: PROJECT_ID, project_name: 'My App' }],
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('a@b.com');
    expect(res.body.data.projectName).toBe('My App');
  });
});
