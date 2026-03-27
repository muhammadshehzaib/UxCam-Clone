import { db } from '../../db/client';
import { storeDOMFrames, getDOMFrames, hasDOMRecording } from '../../services/domSnapshotService';

const mockDb = db as unknown as { query: jest.Mock };

const SESSION_ID = 'sess-1';
const PROJECT_ID = 'proj-1';

describe('domSnapshotService', () => {
  describe('storeDOMFrames', () => {
    it('inserts a snapshot frame', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      await storeDOMFrames(SESSION_ID, PROJECT_ID, [
        { type: 'snapshot', elapsedMs: 0, data: JSON.stringify({ type: 'snapshot', node: {} }) },
      ]);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dom_snapshots'),
        expect.arrayContaining([SESSION_ID, PROJECT_ID, 0, 'snapshot'])
      );
    });

    it('inserts a mutation frame', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      await storeDOMFrames(SESSION_ID, PROJECT_ID, [
        { type: 'mutation', elapsedMs: 500, data: JSON.stringify({ adds: [], removes: [] }) },
      ]);
      const params = mockDb.query.mock.calls[0][1];
      expect(params[3]).toBe('mutation');
    });

    it('skips frames larger than 2MB', async () => {
      const largeData = 'x'.repeat(2 * 1024 * 1024 + 1);
      await storeDOMFrames(SESSION_ID, PROJECT_ID, [
        { type: 'snapshot', elapsedMs: 0, data: largeData },
      ]);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('caps batch at 50 frames', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      const frames = Array.from({ length: 60 }, (_, i) => ({
        type: 'mutation', elapsedMs: i * 200, data: '{}',
      }));
      await storeDOMFrames(SESSION_ID, PROJECT_ID, frames);
      expect(mockDb.query).toHaveBeenCalledTimes(50);
    });

    it('stores correct byte_size', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      const data = '{"hello":"world"}';
      await storeDOMFrames(SESSION_ID, PROJECT_ID, [
        { type: 'mutation', elapsedMs: 100, data },
      ]);
      const params = mockDb.query.mock.calls[0][1];
      expect(params[5]).toBe(Buffer.byteLength(data, 'utf8'));
    });
  });

  describe('getDOMFrames', () => {
    it('returns frames ordered by elapsed_ms ASC', async () => {
      mockDb.query.mockResolvedValue({
        rows: [
          { id: '1', session_id: SESSION_ID, elapsed_ms: 0,   type: 'snapshot', data: '{}', byte_size: 2, created_at: '' },
          { id: '2', session_id: SESSION_ID, elapsed_ms: 200, type: 'mutation', data: '{}', byte_size: 2, created_at: '' },
        ],
      });
      const result = await getDOMFrames(SESSION_ID, PROJECT_ID);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('snapshot');
      expect(result[1].elapsed_ms).toBe(200);
    });

    it('returns empty array when no frames', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      const result = await getDOMFrames(SESSION_ID, PROJECT_ID);
      expect(result).toEqual([]);
    });

    it('scopes query to session_id and project_id', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      await getDOMFrames(SESSION_ID, PROJECT_ID);
      const params = mockDb.query.mock.calls[0][1];
      expect(params).toContain(SESSION_ID);
      expect(params).toContain(PROJECT_ID);
    });
  });

  describe('hasDOMRecording', () => {
    it('returns true when frames exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
      expect(await hasDOMRecording(SESSION_ID, PROJECT_ID)).toBe(true);
    });

    it('returns false when no frames', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      expect(await hasDOMRecording(SESSION_ID, PROJECT_ID)).toBe(false);
    });
  });
});
