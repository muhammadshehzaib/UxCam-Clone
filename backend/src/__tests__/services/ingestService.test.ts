import { db } from '../../db/client';
import { redis } from '../../db/redis';
import {
  startSession,
  ingestBatch,
  endSession,
  identifyUser,
} from '../../services/ingestService';

const mockDb = db as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock; hset: jest.Mock; expire: jest.Mock; del: jest.Mock; incr: jest.Mock };

const PROJECT_ID = 'proj-1';
const SESSION_ID = 'sess-1';
const ANON_ID = 'anon-1';

describe('ingestService', () => {
  describe('startSession', () => {
    it('upserts app_user, inserts session, and caches in Redis', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 } as any);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await startSession(PROJECT_ID, SESSION_ID, ANON_ID, Date.now(), {
        type: 'desktop',
        os: 'macOS',
        browser: 'Chrome',
      });

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      // First call: upsert app_users
      expect(mockDb.query.mock.calls[0][0]).toMatch(/INSERT INTO app_users/);
      // Second call: insert sessions
      expect(mockDb.query.mock.calls[1][0]).toMatch(/INSERT INTO sessions/);
      expect(mockRedis.hset).toHaveBeenCalledWith(
        `session:active:${SESSION_ID}`,
        expect.objectContaining({ projectId: PROJECT_ID, anonymousId: ANON_ID })
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(`session:active:${SESSION_ID}`, 1800);
    });
  });

  describe('ingestBatch', () => {
    it('bulk-inserts events and increments event_count', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 2 } as any);
      mockRedis.del.mockResolvedValue(1);

      const events = [
        { type: 'click', timestamp: Date.now(), elapsedMs: 1000, x: 0.5, y: 0.3 },
        { type: 'scroll', timestamp: Date.now(), elapsedMs: 2000, value: '400' },
      ];

      const inserted = await ingestBatch(PROJECT_ID, SESSION_ID, events);

      expect(inserted).toBe(2);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      // First call: bulk INSERT events
      expect(mockDb.query.mock.calls[0][0]).toMatch(/INSERT INTO events/);
      // Second call: UPDATE event_count
      expect(mockDb.query.mock.calls[1][0]).toMatch(/UPDATE sessions SET event_count/);
      expect(mockRedis.del).toHaveBeenCalledWith(`analytics:summary:${PROJECT_ID}`);
    });

    it('inserts 0 events and returns 0 when array is empty', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);
      mockRedis.del.mockResolvedValue(1);
      // Empty array: no INSERT, but UPDATE and DEL still run
      const inserted = await ingestBatch(PROJECT_ID, SESSION_ID, []);
      expect(inserted).toBe(0);
    });
  });

  describe('endSession', () => {
    it('updates ended_at, increments user session_count, clears Redis', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ duration_ms: 60000 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
      mockRedis.del.mockResolvedValue(1);

      const durationMs = await endSession(PROJECT_ID, SESSION_ID, Date.now());

      expect(durationMs).toBe(60000);
      expect(mockDb.query.mock.calls[0][0]).toMatch(/UPDATE sessions/);
      expect(mockDb.query.mock.calls[0][0]).toMatch(/ended_at/);
      expect(mockDb.query.mock.calls[1][0]).toMatch(/UPDATE app_users/);
      expect(mockRedis.del).toHaveBeenCalledWith(`session:active:${SESSION_ID}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`analytics:summary:${PROJECT_ID}`);
    });
  });

  describe('identifyUser', () => {
    it('merges external_id and traits, returns internal user id', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: 'user-uuid' }], rowCount: 1 } as any);

      const id = await identifyUser(PROJECT_ID, ANON_ID, 'ext-123', { name: 'Alice' });

      expect(id).toBe('user-uuid');
      expect(mockDb.query.mock.calls[0][0]).toMatch(/UPDATE app_users/);
      expect(mockDb.query.mock.calls[0][1]).toContain('ext-123');
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await expect(
        identifyUser(PROJECT_ID, 'unknown-anon', null, {})
      ).rejects.toThrow('NOT_FOUND');
    });
  });
});
