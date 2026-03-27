import { db } from '../../db/client';
import { updateNote, updateTags } from '../../services/sessionAnnotationsService';

const mockDb = db as unknown as { query: jest.Mock };

const PROJECT_ID = 'proj-1';
const SESSION_ID = 'sess-1';

describe('sessionAnnotationsService', () => {
  describe('updateNote', () => {
    it('merges note into metadata using || operator', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID }] });
      await updateNote(PROJECT_ID, SESSION_ID, 'broken payment flow');
      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toMatch(/metadata = metadata \|\| \$1::jsonb/);
    });

    it('stores the note value in the JSON payload', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID }] });
      await updateNote(PROJECT_ID, SESSION_ID, 'my note');
      const payload = JSON.parse(mockDb.query.mock.calls[0][1][0]);
      expect(payload.note).toBe('my note');
    });

    it('stores empty string to remove the note', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID }] });
      await updateNote(PROJECT_ID, SESSION_ID, '');
      const payload = JSON.parse(mockDb.query.mock.calls[0][1][0]);
      expect(payload.note).toBe('');
    });

    it('does NOT include other keys in the patch payload (preserves rage_click etc)', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID }] });
      await updateNote(PROJECT_ID, SESSION_ID, 'note');
      const payload = JSON.parse(mockDb.query.mock.calls[0][1][0]);
      expect(Object.keys(payload)).toEqual(['note']);
    });

    it('throws NOT_FOUND when session does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      await expect(updateNote(PROJECT_ID, SESSION_ID, 'note')).rejects.toThrow('NOT_FOUND');
    });

    it('scopes update to project_id', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID }] });
      await updateNote(PROJECT_ID, SESSION_ID, 'note');
      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params).toContain(PROJECT_ID);
      expect(params).toContain(SESSION_ID);
    });
  });

  describe('updateTags', () => {
    it('merges tags array into metadata', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID }] });
      await updateTags(PROJECT_ID, SESSION_ID, ['bug', 'reviewed']);
      const payload = JSON.parse(mockDb.query.mock.calls[0][1][0]);
      expect(payload.tags).toEqual(['bug', 'reviewed']);
    });

    it('stores empty array to remove all tags', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID }] });
      await updateTags(PROJECT_ID, SESSION_ID, []);
      const payload = JSON.parse(mockDb.query.mock.calls[0][1][0]);
      expect(payload.tags).toEqual([]);
    });

    it('does NOT include other keys in the patch payload', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID }] });
      await updateTags(PROJECT_ID, SESSION_ID, ['bug']);
      const payload = JSON.parse(mockDb.query.mock.calls[0][1][0]);
      expect(Object.keys(payload)).toEqual(['tags']);
    });

    it('throws NOT_FOUND for unknown session', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      await expect(updateTags(PROJECT_ID, 'nonexistent', ['bug'])).rejects.toThrow('NOT_FOUND');
    });

    it('scopes update to project_id', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID }] });
      await updateTags(PROJECT_ID, SESSION_ID, ['bug']);
      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params).toContain(PROJECT_ID);
    });
  });
});
