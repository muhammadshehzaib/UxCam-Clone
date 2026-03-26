import { db } from '../../db/client';
import {
  listSegments,
  createSegment,
  updateSegment,
  deleteSegment,
} from '../../services/segmentService';

const mockDb    = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';
const SEG_ID     = 'seg-uuid-1';

const MOCK_SEGMENT = {
  id:         SEG_ID,
  project_id: PROJECT_ID,
  name:       'Mobile iOS',
  filters:    { device: 'mobile', os: 'iOS' },
  created_at: '2024-01-01T00:00:00Z',
};

// ── listSegments ──────────────────────────────────────────────────────────────

describe('listSegments', () => {
  it('returns segments ordered by created_at DESC', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    const result = await listSegments(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Mobile iOS');
  });

  it('returns empty array when no segments exist', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const result = await listSegments(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('queries by project_id ordered by created_at DESC', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await listSegments(PROJECT_ID);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/project_id = \$1/);
    expect(sql).toMatch(/ORDER BY created_at DESC/);
  });
});

// ── createSegment ─────────────────────────────────────────────────────────────

describe('createSegment', () => {
  it('inserts and returns the new segment', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    const result = await createSegment(PROJECT_ID, 'Mobile iOS', { device: 'mobile', os: 'iOS' });
    expect(result.name).toBe('Mobile iOS');
    expect(mockDb.query.mock.calls[0][0]).toMatch(/INSERT INTO segments/);
  });

  it('throws INVALID_NAME for empty name', async () => {
    await expect(createSegment(PROJECT_ID, '  ', { device: 'mobile' })).rejects.toThrow('INVALID_NAME');
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('throws NO_FILTERS when filters object has no valid keys', async () => {
    await expect(createSegment(PROJECT_ID, 'Test', {})).rejects.toThrow('NO_FILTERS');
  });

  it('strips unknown filter keys (whitelist enforced)', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    await createSegment(PROJECT_ID, 'Test', { device: 'mobile', unknownKey: 'bad' } as Record<string, unknown>);
    const storedFilters = JSON.parse(mockDb.query.mock.calls[0][1][2]);
    expect(storedFilters).not.toHaveProperty('unknownKey');
    expect(storedFilters).toHaveProperty('device', 'mobile');
  });

  it('trims whitespace from name', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    await createSegment(PROJECT_ID, '  My Segment  ', { device: 'mobile' });
    expect(mockDb.query.mock.calls[0][1][1]).toBe('My Segment');
  });

  it('stores rageClick: true correctly', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    await createSegment(PROJECT_ID, 'Rage', { rageClick: true });
    const stored = JSON.parse(mockDb.query.mock.calls[0][1][2]);
    expect(stored.rageClick).toBe(true);
  });

  it('does NOT store dateFrom or dateTo (dynamic filters not saved)', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    await createSegment(PROJECT_ID, 'Test', { device: 'mobile', dateFrom: '2024-01-01' } as Record<string, unknown>);
    const stored = JSON.parse(mockDb.query.mock.calls[0][1][2]);
    expect(stored).not.toHaveProperty('dateFrom');
    expect(stored).toHaveProperty('device');
  });
});

// ── updateSegment ─────────────────────────────────────────────────────────────

describe('updateSegment', () => {
  it('updates and returns the segment', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ ...MOCK_SEGMENT, name: 'Updated' }] });
    const result = await updateSegment(PROJECT_ID, SEG_ID, 'Updated', { os: 'Android' });
    expect(result.name).toBe('Updated');
    expect(mockDb.query.mock.calls[0][0]).toMatch(/UPDATE segments/);
  });

  it('throws NOT_FOUND when no rows updated', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await expect(updateSegment(PROJECT_ID, 'nonexistent', 'X', { os: 'iOS' })).rejects.toThrow('NOT_FOUND');
  });

  it('throws INVALID_NAME for empty name', async () => {
    await expect(updateSegment(PROJECT_ID, SEG_ID, '', { os: 'iOS' })).rejects.toThrow('INVALID_NAME');
  });

  it('scopes update to project_id', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT] });
    await updateSegment(PROJECT_ID, SEG_ID, 'Name', { os: 'iOS' });
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).toContain(PROJECT_ID);
    expect(params).toContain(SEG_ID);
  });
});

// ── deleteSegment ─────────────────────────────────────────────────────────────

describe('deleteSegment', () => {
  it('deletes successfully when segment exists', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: SEG_ID }] });
    await expect(deleteSegment(PROJECT_ID, SEG_ID)).resolves.toBeUndefined();
  });

  it('throws NOT_FOUND when segment does not exist', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await expect(deleteSegment(PROJECT_ID, 'nonexistent')).rejects.toThrow('NOT_FOUND');
  });

  it('scopes delete to project_id', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: SEG_ID }] });
    await deleteSegment(PROJECT_ID, SEG_ID);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).toContain(PROJECT_ID);
    expect(params).toContain(SEG_ID);
  });
});
