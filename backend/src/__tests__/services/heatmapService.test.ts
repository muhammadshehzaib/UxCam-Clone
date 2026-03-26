import { db } from '../../db/client';
import { redis } from '../../db/redis';
import { getHeatmap, getScreenNames } from '../../services/heatmapService';

const mockDb = db as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock };

const PROJECT_ID = 'proj-1';
const SCREEN_NAME = '/home';

const MOCK_POINTS = [
  { x: '0.50', y: '0.30', count: '12' },
  { x: '0.80', y: '0.10', count: '5'  },
  { x: '0.20', y: '0.70', count: '3'  },
];

describe('heatmapService', () => {
  describe('getHeatmap', () => {
    it('returns cached result when cache hit', async () => {
      const cached = [{ x: 0.5, y: 0.3, count: 12 }];
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await getHeatmap(PROJECT_ID, SCREEN_NAME, 30);

      expect(result).toEqual(cached);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('queries db and caches result on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.query.mockResolvedValue({ rows: MOCK_POINTS });

      const result = await getHeatmap(PROJECT_ID, SCREEN_NAME, 30);

      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `heatmap:${PROJECT_ID}:${SCREEN_NAME}:30`,
        expect.any(String),
        'EX',
        300
      );
      expect(result).toHaveLength(3);
    });

    it('parses row values as floats and ints', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.query.mockResolvedValue({ rows: MOCK_POINTS });

      const result = await getHeatmap(PROJECT_ID, SCREEN_NAME, 30);

      expect(result[0]).toEqual({ x: 0.5, y: 0.3, count: 12 });
      expect(result[1]).toEqual({ x: 0.8, y: 0.1, count: 5 });
    });

    it('filters by click type, screen_name and timestamp', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.query.mockResolvedValue({ rows: [] });

      await getHeatmap(PROJECT_ID, SCREEN_NAME, 30);

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toMatch(/type = 'click'/);
      expect(sql).toMatch(/screen_name = \$2/);
      expect(sql).toMatch(/timestamp >= \$3/);
      expect(sql).toMatch(/x IS NOT NULL/);
      expect(sql).toMatch(/y IS NOT NULL/);
    });

    it('buckets coordinates using ROUND to 2 decimal places', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.query.mockResolvedValue({ rows: [] });

      await getHeatmap(PROJECT_ID, SCREEN_NAME, 30);

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toMatch(/ROUND\(x::numeric, 2\)/);
      expect(sql).toMatch(/ROUND\(y::numeric, 2\)/);
    });

    it('returns empty array when no clicks recorded', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await getHeatmap(PROJECT_ID, SCREEN_NAME, 30);

      expect(result).toEqual([]);
    });

    it('uses correct cache key including days param', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDb.query.mockResolvedValue({ rows: [] });

      await getHeatmap(PROJECT_ID, SCREEN_NAME, 7);

      expect(mockRedis.get).toHaveBeenCalledWith(`heatmap:${PROJECT_ID}:${SCREEN_NAME}:7`);
    });
  });

  describe('getScreenNames', () => {
    it('returns distinct screen names ordered alphabetically', async () => {
      mockDb.query.mockResolvedValue({
        rows: [
          { screen_name: '/checkout' },
          { screen_name: '/home' },
          { screen_name: '/profile' },
        ],
      });

      const result = await getScreenNames(PROJECT_ID, 30);

      expect(result).toEqual(['/checkout', '/home', '/profile']);
    });

    it('queries only non-null screen_names', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await getScreenNames(PROJECT_ID, 30);

      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toMatch(/screen_name IS NOT NULL/);
      expect(sql).toMatch(/DISTINCT screen_name/);
    });

    it('filters by days param', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await getScreenNames(PROJECT_ID, 7);

      const params = mockDb.query.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(PROJECT_ID);
      expect(params[1]).toBeInstanceOf(Date);
    });

    it('returns empty array when no screens recorded', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await getScreenNames(PROJECT_ID, 30);

      expect(result).toEqual([]);
    });
  });
});
