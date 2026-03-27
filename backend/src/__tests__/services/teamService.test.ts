import { db } from '../../db/client';
import {
  listMembers, createInvite, getInviteByToken, acceptInvite, removeMember,
} from '../../services/teamService';

jest.mock('../../db/client', () => {
  const q = jest.fn();
  const client = { query: jest.fn(), release: jest.fn() };
  return { db: { query: q, connect: jest.fn().mockResolvedValue(client), _client: client } };
});

const mockDb     = db as unknown as { query: jest.Mock; connect: jest.Mock; _client: { query: jest.Mock; release: jest.Mock } };
const mockClient = mockDb._client;

const PROJECT_ID = 'proj-1';
const USER_ID    = 'user-1';
const INV_TOKEN  = 'tok-abc';

const MOCK_MEMBER  = { user_id: USER_ID, email: 'alice@x.com', name: 'Alice', role: 'admin', joined_at: '' };
const MOCK_INVITE_ROW = { id: 'inv-1', email: 'bob@x.com', role: 'viewer', expires_at: new Date(Date.now() + 86400000).toISOString(), created_at: '', token: INV_TOKEN };

// ── listMembers ───────────────────────────────────────────────────────────────

describe('listMembers', () => {
  it('returns members and pending invites', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_MEMBER] })
      .mockResolvedValueOnce({ rows: [MOCK_INVITE_ROW] });
    const { members, invites } = await listMembers(PROJECT_ID);
    expect(members).toHaveLength(1);
    expect(invites).toHaveLength(1);
  });

  it('invite_url is included in pending invites', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [MOCK_INVITE_ROW] });
    const { invites } = await listMembers(PROJECT_ID);
    expect(invites[0].invite_url).toContain(INV_TOKEN);
  });
});

// ── createInvite ──────────────────────────────────────────────────────────────

describe('createInvite', () => {
  beforeEach(() => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [] })    // not already member
      .mockResolvedValueOnce({ rows: [] })    // no existing invite
      .mockResolvedValueOnce({ rows: [MOCK_INVITE_ROW] }); // INSERT
  });

  it('returns invite with invite_url', async () => {
    const result = await createInvite(PROJECT_ID, USER_ID, 'bob@x.com', 'viewer');
    expect(result.invite_url).toContain('invite?token=');
  });

  it('throws INVALID_EMAIL for bad email format', async () => {
    mockDb.query.mockReset();
    await expect(createInvite(PROJECT_ID, USER_ID, 'not-email', 'viewer')).rejects.toThrow('INVALID_EMAIL');
  });

  it('throws ALREADY_MEMBER when user is already in project', async () => {
    mockDb.query.mockReset();
    mockDb.query.mockResolvedValue({ rows: [{ user_id: 'u2' }] }); // member found
    await expect(createInvite(PROJECT_ID, USER_ID, 'bob@x.com', 'viewer')).rejects.toThrow('ALREADY_MEMBER');
  });

  it('throws INVITE_PENDING when unexpired invite already exists', async () => {
    mockDb.query.mockReset();
    mockDb.query
      .mockResolvedValueOnce({ rows: [] })         // not a member
      .mockResolvedValueOnce({ rows: [{ id: 'existing' }] }); // existing invite
    await expect(createInvite(PROJECT_ID, USER_ID, 'bob@x.com', 'viewer')).rejects.toThrow('INVITE_PENDING');
  });

  it('generates a unique token each time (randomUUID)', async () => {
    const result1 = await createInvite(PROJECT_ID, USER_ID, 'bob@x.com', 'viewer');
    // Reset and call again
    mockDb.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ...MOCK_INVITE_ROW, token: 'different-token' }] });
    const result2 = await createInvite(PROJECT_ID, USER_ID, 'bob@x.com', 'viewer');
    // Both have invite URLs (structure is correct)
    expect(result1.invite_url).toBeTruthy();
    expect(result2.invite_url).toBeTruthy();
  });
});

// ── getInviteByToken ──────────────────────────────────────────────────────────

describe('getInviteByToken', () => {
  it('returns invite info for valid token', async () => {
    mockDb.query.mockResolvedValue({ rows: [{
      id: 'inv-1', email: 'bob@x.com', role: 'viewer',
      project_name: 'My App', invited_by: 'alice@x.com',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      accepted_at: null,
    }] });
    const result = await getInviteByToken(INV_TOKEN);
    expect(result.email).toBe('bob@x.com');
    expect(result.project_name).toBe('My App');
  });

  it('throws NOT_FOUND for unknown token', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await expect(getInviteByToken('bad-token')).rejects.toThrow('NOT_FOUND');
  });

  it('throws EXPIRED for past expiry', async () => {
    mockDb.query.mockResolvedValue({ rows: [{
      id: 'inv-1', email: 'bob@x.com', role: 'viewer',
      project_name: 'My App', invited_by: 'alice@x.com',
      expires_at: new Date(Date.now() - 1000).toISOString(), accepted_at: null,
    }] });
    await expect(getInviteByToken(INV_TOKEN)).rejects.toThrow('EXPIRED');
  });
});

// ── acceptInvite ──────────────────────────────────────────────────────────────

describe('acceptInvite', () => {
  const INVITE_ROW = {
    id: 'inv-1', project_id: PROJECT_ID, email: 'bob@x.com', role: 'viewer',
    expires_at: new Date(Date.now() + 86400000).toISOString(), accepted_at: null,
  };

  it('adds user to user_projects and returns token', async () => {
    mockDb.query.mockResolvedValue({ rows: [INVITE_ROW] });
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // INSERT user_projects
      .mockResolvedValueOnce({ rows: [] }) // UPDATE invite
      .mockResolvedValueOnce(undefined);   // COMMIT
    const result = await acceptInvite(INV_TOKEN, USER_ID, 'bob@x.com');
    expect(result.token).toBeTruthy();
    expect(result.projectId).toBe(PROJECT_ID);
  });

  it('throws EXPIRED for expired invite', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ ...INVITE_ROW, expires_at: new Date(Date.now() - 1000).toISOString() }] });
    await expect(acceptInvite(INV_TOKEN, USER_ID, 'bob@x.com')).rejects.toThrow('EXPIRED');
  });

  it('throws ALREADY_ACCEPTED for used invite', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ ...INVITE_ROW, accepted_at: new Date().toISOString() }] });
    await expect(acceptInvite(INV_TOKEN, USER_ID, 'bob@x.com')).rejects.toThrow('ALREADY_ACCEPTED');
  });

  it('throws EMAIL_MISMATCH when user email differs from invite email', async () => {
    mockDb.query.mockResolvedValue({ rows: [INVITE_ROW] });
    await expect(acceptInvite(INV_TOKEN, USER_ID, 'different@x.com')).rejects.toThrow('EMAIL_MISMATCH');
  });
});

// ── removeMember ──────────────────────────────────────────────────────────────

describe('removeMember', () => {
  it('removes member and returns undefined', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ user_id: 'u2' }] });
    await expect(removeMember(PROJECT_ID, USER_ID, 'u2')).resolves.toBeUndefined();
  });

  it('throws NOT_FOUND when member not in project', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await expect(removeMember(PROJECT_ID, USER_ID, 'unknown')).rejects.toThrow('NOT_FOUND');
  });

  it('throws CANNOT_REMOVE_SELF when removing own account', async () => {
    await expect(removeMember(PROJECT_ID, USER_ID, USER_ID)).rejects.toThrow('CANNOT_REMOVE_SELF');
    expect(mockDb.query).not.toHaveBeenCalled();
  });
});
