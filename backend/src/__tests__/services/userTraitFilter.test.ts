import { db } from '../../db/client';
import { listUsers, getTraitKeys } from '../../services/usersService';

const mockDb = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';

describe('listUsers — trait filters', () => {
  beforeEach(() => mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 }));

  it('single trait filter adds JSONB arrow condition', async () => {
    await listUsers(PROJECT_ID, 1, 20, { traitFilters: [{ key: 'plan', value: 'pro' }] });
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/traits->>'plan' ILIKE/);
  });

  it('value is wrapped in % for ILIKE matching', async () => {
    await listUsers(PROJECT_ID, 1, 20, { traitFilters: [{ key: 'plan', value: 'pro' }] });
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('%pro%');
  });

  it('multiple trait filters are ANDed together', async () => {
    await listUsers(PROJECT_ID, 1, 20, { traitFilters: [{ key: 'plan', value: 'pro' }, { key: 'country', value: 'US' }] });
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/traits->>'plan' ILIKE/);
    expect(sql).toMatch(/traits->>'country' ILIKE/);
  });

  it('empty traitFilters adds no condition', async () => {
    await listUsers(PROJECT_ID, 1, 20, { traitFilters: [] });
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).not.toMatch(/traits->>/);
  });

  it('undefined traitFilters adds no condition', async () => {
    await listUsers(PROJECT_ID, 1, 20, { traitFilters: undefined });
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).not.toMatch(/traits->>/);
  });
});

describe('getTraitKeys', () => {
  it('returns distinct trait keys', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ key: 'email' }, { key: 'name' }, { key: 'plan' }] });
    const keys = await getTraitKeys(PROJECT_ID);
    expect(keys).toEqual(['email', 'name', 'plan']);
  });

  it('filters by project_id', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getTraitKeys(PROJECT_ID);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(PROJECT_ID);
  });

  it('returns empty array when no traits', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const keys = await getTraitKeys(PROJECT_ID);
    expect(keys).toEqual([]);
  });

  it('uses jsonb_object_keys to discover keys', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getTraitKeys(PROJECT_ID);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/jsonb_object_keys/);
  });
});
