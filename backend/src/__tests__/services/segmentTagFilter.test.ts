import { db } from '../../db/client';
import { createSegment, listSegments } from '../../services/segmentService';

const mockDb = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';

const MOCK_SEGMENT_WITH_TAGS = {
  id: 'seg-1', project_id: PROJECT_ID,
  name: 'Bug sessions', filters: { tags: ['bug', 'important'] }, created_at: '',
};

describe('segmentService — tag filter', () => {
  it("'tags' is in ALLOWED_FILTER_KEYS — stored when provided", async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT_WITH_TAGS] });
    const result = await createSegment(PROJECT_ID, 'Bug sessions', { tags: ['bug'] });
    const stored = JSON.parse(mockDb.query.mock.calls[0][1][2]);
    expect(stored.tags).toEqual(['bug']);
  });

  it('tags array survives sanitizeFilters round-trip', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT_WITH_TAGS] });
    await createSegment(PROJECT_ID, 'Test', { tags: ['bug', 'important'] });
    const stored = JSON.parse(mockDb.query.mock.calls[0][1][2]);
    expect(stored.tags).toEqual(['bug', 'important']);
  });

  it('empty tags array is stripped (treated as no filter)', async () => {
    // Empty array → sanitizeFilters removes it → NO_FILTERS error if no other filters
    mockDb.query.mockResolvedValue({ rows: [] });
    await expect(createSegment(PROJECT_ID, 'Test', { tags: [] })).rejects.toThrow('NO_FILTERS');
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('tags can be the sole filter (no device/os needed)', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_SEGMENT_WITH_TAGS] });
    // Should NOT throw NO_FILTERS
    await expect(
      createSegment(PROJECT_ID, 'Bug only', { tags: ['bug'] })
    ).resolves.toBeDefined();
  });
});
