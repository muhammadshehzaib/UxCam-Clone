import { db } from '../../db/client';
import { listSessions } from '../../services/sessionsService';

const mockDb = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';

describe('sessionsService — tag filtering', () => {
  beforeEach(() => {
    mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('adds JSONB containment condition for a single tag', async () => {
    await listSessions(PROJECT_ID, 1, 20, { tags: ['bug'] });
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/@>/);
    expect(sql).toMatch(/metadata->'tags'/);
  });

  it('uses parameterised query for tag value (no injection)', async () => {
    await listSessions(PROJECT_ID, 1, 20, { tags: ['bug'] });
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('["bug"]');
  });

  it('multiple tags create OR conditions', async () => {
    await listSessions(PROJECT_ID, 1, 20, { tags: ['bug', 'important'] });
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/OR/);
  });

  it('each tag uses its own parameterised value', async () => {
    await listSessions(PROJECT_ID, 1, 20, { tags: ['bug', 'reviewed'] });
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('["bug"]');
    expect(params).toContain('["reviewed"]');
  });

  it('empty tags array adds no condition', async () => {
    await listSessions(PROJECT_ID, 1, 20, { tags: [] });
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).not.toMatch(/@>/);
  });

  it('undefined tags adds no condition', async () => {
    await listSessions(PROJECT_ID, 1, 20, { tags: undefined });
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).not.toMatch(/@>/);
  });
});
