import { db } from '../../db/client';
import { getEventsBySession } from '../../services/eventsService';

const mockDb = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';
const SESSION_ID = 'sess-1';

const MOCK_EVENTS = [
  { id: 1, type: 'click', elapsed_ms: 1000, x: 0.5, y: 0.3 },
  { id: 2, type: 'scroll', elapsed_ms: 2000, value: '400' },
  { id: 3, type: 'navigate', elapsed_ms: 3000, screen_name: '/checkout' },
];

describe('eventsService', () => {
  describe('getEventsBySession', () => {
    it('returns events ordered by elapsed_ms when session exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: SESSION_ID }], rowCount: 1 } as any) // session check
        .mockResolvedValueOnce({ rows: MOCK_EVENTS, rowCount: 3 } as any);           // events query

      const events = await getEventsBySession(PROJECT_ID, SESSION_ID);

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('click');
      // Verify events query orders by elapsed_ms
      expect(mockDb.query.mock.calls[1][0]).toMatch(/ORDER BY elapsed_ms ASC/);
    });

    it('throws NOT_FOUND when session does not belong to project', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await expect(getEventsBySession(PROJECT_ID, 'other-session')).rejects.toThrow('NOT_FOUND');
    });

    it('returns empty array when session has no events', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: SESSION_ID }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const events = await getEventsBySession(PROJECT_ID, SESSION_ID);
      expect(events).toHaveLength(0);
    });
  });
});
