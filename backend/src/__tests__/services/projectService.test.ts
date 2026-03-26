import jwt from 'jsonwebtoken';
import { db } from '../../db/client';
import { listUserProjects, createProject, switchProject } from '../../services/projectService';
import { config } from '../../config';

jest.mock('../../db/client', () => {
  const queryFn = jest.fn();
  const client  = { query: jest.fn(), release: jest.fn() };
  return { db: { query: queryFn, connect: jest.fn().mockResolvedValue(client), _client: client } };
});

const mockDb     = db as unknown as { query: jest.Mock; connect: jest.Mock; _client: { query: jest.Mock; release: jest.Mock } };
const mockClient = mockDb._client;

const USER_ID    = 'user-uuid';
const USER_EMAIL = 'a@b.com';
const PROJECT_ID = 'proj-uuid';

const MOCK_PROJECTS = [
  { id: PROJECT_ID, name: 'My App', api_key: 'key_abc', role: 'admin', created_at: '2024-01-01T00:00:00Z' },
  { id: 'proj-2',   name: 'Other',  api_key: 'key_xyz', role: 'admin', created_at: '2024-02-01T00:00:00Z' },
];

// ── listUserProjects ──────────────────────────────────────────────────────────

describe('listUserProjects', () => {
  it('returns all projects for the user', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_PROJECTS });
    const result = await listUserProjects(USER_ID);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('My App');
  });

  it('returns empty array when user has no projects', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const result = await listUserProjects(USER_ID);
    expect(result).toEqual([]);
  });

  it('queries via user_projects JOIN projects', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await listUserProjects(USER_ID);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/JOIN user_projects/);
    expect(sql).toMatch(/WHERE up.user_id = \$1/);
  });

  it('includes role from user_projects', async () => {
    mockDb.query.mockResolvedValue({ rows: MOCK_PROJECTS });
    const result = await listUserProjects(USER_ID);
    expect(result[0].role).toBe('admin');
  });

  it('orders by created_at ASC', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await listUserProjects(USER_ID);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/ORDER BY p.created_at ASC/);
  });
});

// ── createProject ─────────────────────────────────────────────────────────────

describe('createProject', () => {
  beforeEach(() => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: PROJECT_ID, name: 'New App', api_key: 'k', created_at: '' }] }) // INSERT project
      .mockResolvedValueOnce({ rows: [] }) // INSERT user_projects
      .mockResolvedValueOnce(undefined);   // COMMIT
  });

  it('returns new project and a JWT', async () => {
    const result = await createProject(USER_ID, USER_EMAIL, 'New App');
    expect(result.project.name).toBe('New App');
    expect(result.token).toBeTruthy();
  });

  it('JWT payload contains correct projectId', async () => {
    const result = await createProject(USER_ID, USER_EMAIL, 'New App');
    const decoded = jwt.decode(result.token) as Record<string, string>;
    expect(decoded.projectId).toBe(PROJECT_ID);
    expect(decoded.sub).toBe(USER_ID);
  });

  it('inserts into user_projects with admin role', async () => {
    await createProject(USER_ID, USER_EMAIL, 'New App');
    const insertUserProjects = mockClient.query.mock.calls[2];
    expect(insertUserProjects[0]).toMatch(/INSERT INTO user_projects/);
    expect(insertUserProjects[1]).toContain('admin');
  });

  it('throws INVALID_NAME for empty name', async () => {
    await expect(createProject(USER_ID, USER_EMAIL, '   ')).rejects.toThrow('INVALID_NAME');
    expect(mockDb.connect).not.toHaveBeenCalled();
  });

  it('trims whitespace from project name', async () => {
    await createProject(USER_ID, USER_EMAIL, '  My App  ');
    const insertProject = mockClient.query.mock.calls[1];
    expect(insertProject[1][0]).toBe('My App');
  });

  it('rolls back transaction on failure', async () => {
    mockClient.query
      .mockReset()
      .mockResolvedValueOnce(undefined)        // BEGIN
      .mockRejectedValueOnce(new Error('DB')); // INSERT fails
    await expect(createProject(USER_ID, USER_EMAIL, 'App')).rejects.toThrow('DB');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

// ── switchProject ─────────────────────────────────────────────────────────────

describe('switchProject', () => {
  it('returns a new JWT and project when user has access', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_PROJECTS[0]] });
    const result = await switchProject(USER_ID, USER_EMAIL, PROJECT_ID);
    expect(result.token).toBeTruthy();
    expect(result.project.id).toBe(PROJECT_ID);
  });

  it('JWT payload contains new projectId', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_PROJECTS[0]] });
    const result = await switchProject(USER_ID, USER_EMAIL, PROJECT_ID);
    const decoded = jwt.decode(result.token) as Record<string, string>;
    expect(decoded.projectId).toBe(PROJECT_ID);
  });

  it('verifies membership via user_projects join', async () => {
    mockDb.query.mockResolvedValue({ rows: [] }); // no membership
    await expect(switchProject(USER_ID, USER_EMAIL, PROJECT_ID)).rejects.toThrow('FORBIDDEN');
  });

  it('throws FORBIDDEN when user has no access to the project', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await expect(switchProject(USER_ID, USER_EMAIL, 'other-project')).rejects.toThrow('FORBIDDEN');
  });

  it('queries with both user_id and project_id filters', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await switchProject(USER_ID, USER_EMAIL, PROJECT_ID).catch(() => {});
    const params = mockDb.query.mock.calls[0][1] as string[];
    expect(params).toContain(USER_ID);
    expect(params).toContain(PROJECT_ID);
  });

  it('JWT expiry is 7 days', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_PROJECTS[0]] });
    const result = await switchProject(USER_ID, USER_EMAIL, PROJECT_ID);
    const decoded = jwt.decode(result.token) as { exp: number; iat: number };
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
  });
});
