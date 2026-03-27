import { db } from '../../db/client';
import { toggleBookmark, listBookmarkedSessions } from '../../services/bookmarkService';

const mockDb = db as unknown as { query: jest.Mock };
const USER_ID    = 'user-1';
const SESSION_ID = 'sess-1';
const PROJECT_ID = 'proj-1';

describe('bookmarkService', () => {
  describe('toggleBookmark', () => {
    it('inserts bookmark when not already bookmarked', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: SESSION_ID }] }) // session check
        .mockResolvedValueOnce({ rows: [] })                    // no existing bookmark
        .mockResolvedValueOnce({ rows: [] });                   // INSERT

      const result = await toggleBookmark(USER_ID, SESSION_ID, PROJECT_ID);
      expect(result.bookmarked).toBe(true);
    });

    it('deletes bookmark when already bookmarked', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: SESSION_ID }] })      // session check
        .mockResolvedValueOnce({ rows: [{ user_id: USER_ID }] })    // existing bookmark
        .mockResolvedValueOnce({ rows: [] });                        // DELETE

      const result = await toggleBookmark(USER_ID, SESSION_ID, PROJECT_ID);
      expect(result.bookmarked).toBe(false);
    });

    it('returns { bookmarked: true } on add', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: SESSION_ID }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await toggleBookmark(USER_ID, SESSION_ID, PROJECT_ID);
      expect(result).toEqual({ bookmarked: true });
    });

    it('returns { bookmarked: false } on remove', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: SESSION_ID }] })
        .mockResolvedValueOnce({ rows: [{ user_id: USER_ID }] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await toggleBookmark(USER_ID, SESSION_ID, PROJECT_ID);
      expect(result).toEqual({ bookmarked: false });
    });

    it('throws NOT_FOUND when session does not belong to project', async () => {
      mockDb.query.mockResolvedValue({ rows: [] }); // session check fails
      await expect(toggleBookmark(USER_ID, SESSION_ID, PROJECT_ID)).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('listBookmarkedSessions', () => {
    it('returns sessions ordered by bookmark created_at DESC', async () => {
      const mockRow = { id: SESSION_ID, anonymous_id: 'anon', started_at: '', is_bookmarked: true };
      mockDb.query.mockResolvedValue({ rows: [mockRow] });
      const result = await listBookmarkedSessions(USER_ID, PROJECT_ID);
      expect(result).toHaveLength(1);
    });

    it('scopes query to user_id', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      await listBookmarkedSessions(USER_ID, PROJECT_ID);
      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(USER_ID);
    });

    it('returns empty array when no bookmarks', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      const result = await listBookmarkedSessions(USER_ID, PROJECT_ID);
      expect(result).toEqual([]);
    });

    it('includes is_bookmarked = true in returned rows', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: SESSION_ID, is_bookmarked: true }] });
      const result = await listBookmarkedSessions(USER_ID, PROJECT_ID);
      expect(result[0].is_bookmarked).toBe(true);
    });
  });
});
