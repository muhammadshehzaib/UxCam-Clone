import { db } from '../../db/client';
import { listUsers, getUserById, listUserSessions } from '../../services/usersService';

const mockDb = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';
const USER_ID = 'user-1';

const MOCK_USER = {
  id: USER_ID,
  external_id: 'ext-123',
  anonymous_id: 'anon-1',
  traits: { name: 'Alice' },
  first_seen_at: new Date().toISOString(),
  last_seen_at: new Date().toISOString(),
  session_count: 5,
};

describe('usersService', () => {
  describe('listUsers', () => {
    it('returns paginated users with meta', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [MOCK_USER], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '100' }], rowCount: 1 } as any);

      const result = await listUsers(PROJECT_ID, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].external_id).toBe('ext-123');
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 100 });
    });

    it('calculates correct offset for page 2', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await listUsers(PROJECT_ID, 2, 20);

      const queryParams = mockDb.query.mock.calls[0][1] as unknown[];
      // params: [projectId, limit=20, offset=20]
      expect(queryParams[2]).toBe(20);
    });
  });

  describe('getUserById', () => {
    it('returns user when found', async () => {
      mockDb.query.mockResolvedValue({ rows: [MOCK_USER], rowCount: 1 } as any);

      const user = await getUserById(PROJECT_ID, USER_ID);
      expect(user.id).toBe(USER_ID);
      expect(user.traits).toEqual({ name: 'Alice' });
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await expect(getUserById(PROJECT_ID, 'ghost')).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('listUserSessions', () => {
    it('returns sessions for a specific user', async () => {
      const mockSessions = [
        { id: 'sess-1', duration_ms: 30000, device_type: 'desktop' },
        { id: 'sess-2', duration_ms: 60000, device_type: 'mobile' },
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockSessions, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as any);

      const result = await listUserSessions(PROJECT_ID, USER_ID, 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      // Verify user_id filter is applied
      expect(mockDb.query.mock.calls[0][1]).toContain(USER_ID);
    });
  });
});
