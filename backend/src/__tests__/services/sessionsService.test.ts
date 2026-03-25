import { db } from '../../db/client';
import { listSessions, getSessionById } from '../../services/sessionsService';

const mockDb = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';

const MOCK_SESSION = {
  id: 'sess-1',
  anonymous_id: 'anon-1',
  started_at: new Date().toISOString(),
  duration_ms: 60000,
  device_type: 'desktop',
  event_count: 10,
};

describe('sessionsService', () => {
  describe('listSessions', () => {
    it('returns paginated sessions with meta', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [MOCK_SESSION], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ count: '42' }], rowCount: 1 } as any);

      const result = await listSessions(PROJECT_ID, 1, 20, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('sess-1');
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 42 });
    });

    it('applies userId filter when provided', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await listSessions(PROJECT_ID, 1, 20, { userId: 'user-abc' });

      const listQuery = mockDb.query.mock.calls[0][0] as string;
      expect(listQuery).toMatch(/user_id/);
      expect(mockDb.query.mock.calls[0][1]).toContain('user-abc');
    });

    it('applies device filter when provided', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await listSessions(PROJECT_ID, 1, 20, { device: 'mobile' });

      const listQuery = mockDb.query.mock.calls[0][0] as string;
      expect(listQuery).toMatch(/device_type/);
      expect(mockDb.query.mock.calls[0][1]).toContain('mobile');
    });

    it('applies dateFrom and dateTo filters', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as any);

      await listSessions(PROJECT_ID, 1, 20, {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      });

      const listQuery = mockDb.query.mock.calls[0][0] as string;
      expect(listQuery).toMatch(/started_at >=/);
      expect(listQuery).toMatch(/started_at <=/);
    });
  });

  describe('getSessionById', () => {
    it('returns session when found', async () => {
      mockDb.query.mockResolvedValue({ rows: [MOCK_SESSION], rowCount: 1 } as any);

      const session = await getSessionById(PROJECT_ID, 'sess-1');
      expect(session.id).toBe('sess-1');
    });

    it('throws NOT_FOUND when session does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await expect(getSessionById(PROJECT_ID, 'missing')).rejects.toThrow('NOT_FOUND');
    });
  });
});
