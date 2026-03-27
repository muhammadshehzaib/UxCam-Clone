import { db } from '../../db/client';
import { redis } from '../../db/redis';
import { getHeatmap } from '../../services/heatmapService';

const mockDb    = db    as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock };

const PROJECT_ID = 'proj-1';
const SCREEN     = '/home';

beforeEach(() => {
  mockRedis.get.mockResolvedValue(null);
  mockRedis.set.mockResolvedValue('OK');
});

describe('getHeatmap — device filter', () => {
  it('no device param → no JOIN, no device condition', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getHeatmap(PROJECT_ID, SCREEN, 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).not.toMatch(/JOIN sessions/i);
    expect(sql).not.toMatch(/device_type/);
  });

  it('device = mobile → adds JOIN sessions ses ON ses.id = e.session_id', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getHeatmap(PROJECT_ID, SCREEN, 30, 'mobile');
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/JOIN sessions ses ON ses.id = e.session_id/);
  });

  it('device condition uses ses.device_type = $4', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getHeatmap(PROJECT_ID, SCREEN, 30, 'mobile');
    const sql    = mockDb.query.mock.calls[0][0] as string;
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/ses\.device_type = \$4/);
    expect(params[3]).toBe('mobile');
  });

  it('cache key includes device: heatmap:proj:screen:30:mobile', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getHeatmap(PROJECT_ID, SCREEN, 30, 'mobile');
    expect(mockRedis.get).toHaveBeenCalledWith(`heatmap:${PROJECT_ID}:${SCREEN}:30:mobile`);
  });

  it('cache key includes "all" when no device provided', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getHeatmap(PROJECT_ID, SCREEN, 30);
    expect(mockRedis.get).toHaveBeenCalledWith(`heatmap:${PROJECT_ID}:${SCREEN}:30:all`);
  });
});
