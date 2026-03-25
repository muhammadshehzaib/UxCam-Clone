import { db } from '../../db/client';
import { redis } from '../../db/redis';
import { getSummary, getSessionsOverTime } from '../../services/analyticsService';

const mockDb = db as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock; hset: jest.Mock; expire: jest.Mock; del: jest.Mock; incr: jest.Mock };
const PROJECT_ID = 'proj-1';

const MOCK_SUMMARY = {
  totalUsers: 100,
  totalSessions: 500,
  avgSessionDurationMs: 90000,
  topEvents: [{ name: 'button_click', count: 1200 }],
  topScreens: [{ name: '/dashboard', count: 800 }],
};

describe('analyticsService', () => {
  describe('getSummary', () => {
    it('returns cached result when Redis cache is warm', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(MOCK_SUMMARY));

      const result = await getSummary(PROJECT_ID, 30);

      expect(result).toEqual(MOCK_SUMMARY);
      // Should NOT query Postgres when cache is warm
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('queries Postgres, builds summary, and caches when cache is cold', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total_sessions: '500', avg_duration_ms: '90000' }] } as any)
        .mockResolvedValueOnce({ rows: [{ name: 'button_click', count: '1200' }] } as any)
        .mockResolvedValueOnce({ rows: [{ name: '/dashboard', count: '800' }] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '100' }] } as any);

      const result = await getSummary(PROJECT_ID, 30);

      expect(result.totalUsers).toBe(100);
      expect(result.totalSessions).toBe(500);
      expect(result.avgSessionDurationMs).toBe(90000);
      expect(result.topEvents[0].name).toBe('button_click');
      // Should cache result with 60s TTL
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining(PROJECT_ID),
        expect.any(String),
        'EX',
        60
      );
    });

    it('uses the correct cache key including days param', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(MOCK_SUMMARY));

      await getSummary(PROJECT_ID, 7);

      expect(mockRedis.get).toHaveBeenCalledWith(`analytics:summary:${PROJECT_ID}:7`);
    });
  });

  describe('getSessionsOverTime', () => {
    it('returns sessions grouped by date', async () => {
      mockDb.query.mockResolvedValue({
        rows: [
          { date: '2024-01-01', count: '10' },
          { date: '2024-01-02', count: '15' },
          { date: '2024-01-03', count: '8' },
        ],
      } as any);

      const result = await getSessionsOverTime(PROJECT_ID, 30);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ date: '2024-01-01', count: 10 });
      expect(result[1].count).toBe(15);
      // counts should be parsed as numbers, not strings
      expect(typeof result[0].count).toBe('number');
    });

    it('queries with correct days interval', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      await getSessionsOverTime(PROJECT_ID, 7);

      expect(mockDb.query.mock.calls[0][0]).toMatch(/7 days/);
    });
  });
});
