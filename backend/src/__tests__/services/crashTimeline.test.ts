import { db } from '../../db/client';
import { getCrashTimeline } from '../../services/crashService';

const mockDb = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';

describe('getCrashTimeline', () => {
  it('queries type = crash events', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashTimeline(PROJECT_ID, 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/type = 'crash'/);
  });

  it('groups by DATE(timestamp) ordered ASC', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCrashTimeline(PROJECT_ID, 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/GROUP BY DATE\(timestamp\)/);
    expect(sql).toMatch(/ORDER BY date ASC/);
  });

  it('parses count as integer', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ date: '2024-01-01', count: '5' }] });
    const result = await getCrashTimeline(PROJECT_ID, 30);
    expect(result[0].count).toBe(5);
    expect(typeof result[0].count).toBe('number');
  });

  it('returns empty array when no crashes in period', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const result = await getCrashTimeline(PROJECT_ID, 30);
    expect(result).toEqual([]);
  });
});
