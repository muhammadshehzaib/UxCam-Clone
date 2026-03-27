import { db } from '../../db/client';
import { redis } from '../../db/redis';
import { getRetention } from '../../services/retentionService';

const mockDb    = db    as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock };

const PROJECT_ID = 'proj-1';

const MOCK_SUMMARY_ROW = {
  total_users: '1250',
  d1_pct:      '42.3',
  d7_pct:      '28.1',
  d30_pct:     '15.4',
};

const MOCK_COHORT_ROWS = [
  { cohort_week: '2024-01-01T00:00:00.000Z', total: '150', d1_pct: '45.0', d7_pct: '31.0', d30_pct: '18.0' },
  { cohort_week: '2024-01-08T00:00:00.000Z', total: '120', d1_pct: '38.0', d7_pct: '25.0', d30_pct: '12.0' },
];

describe('retentionService', () => {
  beforeEach(() => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
  });

  // ── Cache ──────────────────────────────────────────────────────────────────

  it('returns cached result without hitting DB on cache hit', async () => {
    const cached = {
      summary: { total_users: 100, d1_pct: 40, d7_pct: 20, d30_pct: 10 },
      cohorts: [],
    };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await getRetention(PROJECT_ID, 90);

    expect(result).toEqual(cached);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('writes result to Redis with 10-minute TTL on cache miss', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY_ROW] })
      .mockResolvedValueOnce({ rows: MOCK_COHORT_ROWS });

    await getRetention(PROJECT_ID, 90);

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('retention:'),
      expect.any(String),
      'EX',
      600
    );
  });

  it('cache key includes projectId and days', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ total_users: '0', d1_pct: null, d7_pct: null, d30_pct: null }] });
    mockDb.query.mockResolvedValueOnce({ rows: [{ total_users: '0', d1_pct: null, d7_pct: null, d30_pct: null }] })
                .mockResolvedValueOnce({ rows: [] });

    await getRetention(PROJECT_ID, 60);

    expect(mockRedis.get).toHaveBeenCalledWith(`retention:${PROJECT_ID}:60`);
  });

  // ── Summary ────────────────────────────────────────────────────────────────

  it('parses summary row into correct types', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY_ROW] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getRetention(PROJECT_ID, 90);

    expect(result.summary.total_users).toBe(1250);
    expect(result.summary.d1_pct).toBe(42.3);
    expect(result.summary.d7_pct).toBe(28.1);
    expect(result.summary.d30_pct).toBe(15.4);
  });

  it('returns 0 for all pcts when SQL returns null (NULLIF division by zero)', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ total_users: '0', d1_pct: null, d7_pct: null, d30_pct: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getRetention(PROJECT_ID, 90);

    expect(result.summary.total_users).toBe(0);
    expect(result.summary.d1_pct).toBe(0);
    expect(result.summary.d7_pct).toBe(0);
    expect(result.summary.d30_pct).toBe(0);
  });

  it('filters summary by project_id', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY_ROW] })
      .mockResolvedValueOnce({ rows: [] });

    await getRetention(PROJECT_ID, 90);

    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(PROJECT_ID);
  });

  it('filters by days param (since = now - days)', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY_ROW] })
      .mockResolvedValueOnce({ rows: [] });

    await getRetention(PROJECT_ID, 30);

    const params  = mockDb.query.mock.calls[0][1] as unknown[];
    const since   = params[1] as Date;
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(30);
  });

  it('runs summary and cohort queries in parallel', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY_ROW] })
      .mockResolvedValueOnce({ rows: MOCK_COHORT_ROWS });

    await getRetention(PROJECT_ID, 90);

    // Both queries should have been called
    expect(mockDb.query).toHaveBeenCalledTimes(2);
  });

  // ── Cohorts ────────────────────────────────────────────────────────────────

  it('parses cohort rows into correct types', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY_ROW] })
      .mockResolvedValueOnce({ rows: MOCK_COHORT_ROWS });

    const result = await getRetention(PROJECT_ID, 90);

    expect(result.cohorts).toHaveLength(2);
    expect(result.cohorts[0].total).toBe(150);
    expect(result.cohorts[0].d1_pct).toBe(45.0);
    expect(result.cohorts[0].d7_pct).toBe(31.0);
    expect(result.cohorts[0].d30_pct).toBe(18.0);
  });

  it('returns empty cohorts array when no users', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ total_users: '0', d1_pct: null, d7_pct: null, d30_pct: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getRetention(PROJECT_ID, 90);

    expect(result.cohorts).toEqual([]);
  });

  it('cohort query groups by week (DATE_TRUNC)', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY_ROW] })
      .mockResolvedValueOnce({ rows: [] });

    await getRetention(PROJECT_ID, 90);

    const cohortSql = mockDb.query.mock.calls[1][0] as string;
    expect(cohortSql).toMatch(/DATE_TRUNC\('week'/);
    expect(cohortSql).toMatch(/GROUP BY cohort_week/);
  });

  it('cohort query uses NULLIF to prevent division by zero', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [MOCK_SUMMARY_ROW] })
      .mockResolvedValueOnce({ rows: [] });

    await getRetention(PROJECT_ID, 90);

    const cohortSql = mockDb.query.mock.calls[1][0] as string;
    expect(cohortSql).toMatch(/NULLIF\(total, 0\)/);
  });
});
