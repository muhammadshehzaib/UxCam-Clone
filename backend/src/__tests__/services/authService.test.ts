import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/client';
import { register, login, getMe } from '../../services/authService';

// db mock — include connect() for transaction support
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

const PROJECT_ID = 'proj-uuid-1';
const USER_ID    = 'user-uuid-1';

// ── register ──────────────────────────────────────────────────────────────────

describe('register', () => {
  beforeEach(() => {
    // No existing user
    mockDb.query.mockResolvedValue({ rows: [] });
    // Transaction: BEGIN, INSERT project, INSERT user, COMMIT
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: PROJECT_ID, name: 'My App' }] }) // INSERT project
      .mockResolvedValueOnce({ rows: [{ id: USER_ID, email: 'a@b.com', name: 'Alice', project_id: PROJECT_ID }] }) // INSERT user
      .mockResolvedValueOnce(undefined); // COMMIT
  });

  it('returns a token and user on success', async () => {
    const result = await register('a@b.com', 'password123', 'My App', 'Alice');
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('a@b.com');
    expect(result.user.projectId).toBe(PROJECT_ID);
  });

  it('hashes the password (stored hash differs from plaintext)', async () => {
    await register('a@b.com', 'password123', 'My App');
    const insertCall = mockClient.query.mock.calls[2]; // INSERT dashboard_users
    const passwordHash = insertCall[1][2] as string;
    expect(passwordHash).not.toBe('password123');
    expect(await bcrypt.compare('password123', passwordHash)).toBe(true);
  });

  it('JWT payload contains sub, projectId, email', async () => {
    const result = await register('a@b.com', 'password123', 'My App');
    const decoded = jwt.decode(result.token) as Record<string, string>;
    expect(decoded.sub).toBe(USER_ID);
    expect(decoded.projectId).toBe(PROJECT_ID);
    expect(decoded.email).toBe('a@b.com');
  });

  it('JWT expires in 7 days', async () => {
    const result = await register('a@b.com', 'password123', 'My App');
    const decoded = jwt.decode(result.token) as { exp: number; iat: number };
    const diff = decoded.exp - decoded.iat;
    expect(diff).toBe(7 * 24 * 60 * 60);
  });

  it('throws DUPLICATE_EMAIL when email exists', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: USER_ID }] }); // email taken
    await expect(register('a@b.com', 'password123', 'App')).rejects.toThrow('DUPLICATE_EMAIL');
  });

  it('throws INVALID_EMAIL for malformed email', async () => {
    await expect(register('not-an-email', 'password123', 'App')).rejects.toThrow('INVALID_EMAIL');
  });

  it('throws WEAK_PASSWORD for password shorter than 8 chars', async () => {
    await expect(register('a@b.com', 'short', 'App')).rejects.toThrow('WEAK_PASSWORD');
  });

  it('throws INVALID_PROJECT_NAME for empty project name', async () => {
    await expect(register('a@b.com', 'password123', '   ')).rejects.toThrow('INVALID_PROJECT_NAME');
  });

  it('normalises email to lowercase', async () => {
    await register('A@B.COM', 'password123', 'My App');
    const insertCall = mockClient.query.mock.calls[2]; // INSERT dashboard_users
    expect(insertCall[1][1]).toBe('a@b.com');
  });

  it('rolls back transaction on insert failure', async () => {
    mockDb.query.mockResolvedValue({ rows: [] }); // no duplicate
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('DB error')); // INSERT project fails
    await expect(register('a@b.com', 'password123', 'App')).rejects.toThrow('DB error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

// ── login ─────────────────────────────────────────────────────────────────────

describe('login', () => {
  const passwordHash = bcrypt.hashSync('mypassword', 1); // fast rounds for tests

  const MOCK_USER = {
    id:            USER_ID,
    email:         'a@b.com',
    name:          'Alice',
    password_hash: passwordHash,
    project_id:    PROJECT_ID,
  };

  it('returns token for valid credentials', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_USER] });
    const result = await login('a@b.com', 'mypassword');
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('a@b.com');
  });

  it('JWT payload contains correct projectId', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_USER] });
    const result = await login('a@b.com', 'mypassword');
    const decoded = jwt.decode(result.token) as Record<string, string>;
    expect(decoded.projectId).toBe(PROJECT_ID);
  });

  it('throws INVALID_CREDENTIALS for wrong password', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_USER] });
    await expect(login('a@b.com', 'wrongpassword')).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('throws INVALID_CREDENTIALS for unknown email', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await expect(login('unknown@b.com', 'mypassword')).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('throws MISSING_FIELDS when email is empty', async () => {
    await expect(login('', 'password')).rejects.toThrow('MISSING_FIELDS');
  });

  it('normalises email to lowercase before lookup', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await login('A@B.COM', 'pass').catch(() => {});
    const params = mockDb.query.mock.calls[0][1] as string[];
    expect(params[0]).toBe('a@b.com');
  });
});

// ── getMe ─────────────────────────────────────────────────────────────────────

describe('getMe', () => {
  it('returns user and project info', async () => {
    mockDb.query.mockResolvedValue({
      rows: [{
        id:           USER_ID,
        email:        'a@b.com',
        name:         'Alice',
        project_id:   PROJECT_ID,
        project_name: 'My App',
      }],
    });
    const result = await getMe(USER_ID);
    expect(result.email).toBe('a@b.com');
    expect(result.projectId).toBe(PROJECT_ID);
    expect(result.projectName).toBe('My App');
  });

  it('throws NOT_FOUND for unknown userId', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await expect(getMe('nonexistent')).rejects.toThrow('NOT_FOUND');
  });
});
