import { db } from '../../db/client';
import {
  listFunnels,
  createFunnel,
  deleteFunnel,
  getFunnelById,
  computeFunnelResults,
} from '../../services/funnelService';

const mockDb = db as unknown as { query: jest.Mock };

const PROJECT_ID = 'proj-1';
const FUNNEL_ID  = 'funnel-1';

const MOCK_FUNNEL = {
  id: FUNNEL_ID,
  project_id: PROJECT_ID,
  name: 'Sign-up Flow',
  steps: [{ screen: '/home' }, { screen: '/signup' }, { screen: '/dashboard' }],
  created_at: '2024-01-01T00:00:00Z',
};

// ── listFunnels ───────────────────────────────────────────────────────────────

describe('listFunnels', () => {
  it('returns all funnels for a project', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_FUNNEL] });
    const result = await listFunnels(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sign-up Flow');
  });

  it('returns empty array when no funnels exist', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const result = await listFunnels(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('queries by project_id ordered by created_at DESC', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await listFunnels(PROJECT_ID);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/project_id = \$1/);
    expect(sql).toMatch(/ORDER BY created_at DESC/);
  });
});

// ── createFunnel ──────────────────────────────────────────────────────────────

describe('createFunnel', () => {
  it('creates a funnel and returns it', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_FUNNEL] });
    const result = await createFunnel(PROJECT_ID, 'Sign-up Flow', MOCK_FUNNEL.steps);
    expect(result.name).toBe('Sign-up Flow');
    expect(mockDb.query.mock.calls[0][0]).toMatch(/INSERT INTO funnels/);
  });

  it('throws INVALID_NAME for empty name', async () => {
    await expect(createFunnel(PROJECT_ID, '  ', MOCK_FUNNEL.steps)).rejects.toThrow('INVALID_NAME');
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('throws TOO_FEW_STEPS when fewer than 2 steps', async () => {
    await expect(createFunnel(PROJECT_ID, 'Test', [{ screen: '/home' }])).rejects.toThrow('TOO_FEW_STEPS');
  });

  it('throws TOO_MANY_STEPS when more than 10 steps', async () => {
    const steps = Array.from({ length: 11 }, (_, i) => ({ screen: `/step-${i}` }));
    await expect(createFunnel(PROJECT_ID, 'Test', steps)).rejects.toThrow('TOO_MANY_STEPS');
  });

  it('throws INVALID_STEP when a step has empty screen', async () => {
    await expect(
      createFunnel(PROJECT_ID, 'Test', [{ screen: '/home' }, { screen: '  ' }])
    ).rejects.toThrow('INVALID_STEP');
  });

  it('trims whitespace from funnel name', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_FUNNEL] });
    await createFunnel(PROJECT_ID, '  My Funnel  ', MOCK_FUNNEL.steps);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params[1]).toBe('My Funnel');
  });

  it('accepts exactly 2 steps (minimum)', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_FUNNEL] });
    await expect(
      createFunnel(PROJECT_ID, 'Min Funnel', [{ screen: '/a' }, { screen: '/b' }])
    ).resolves.toBeDefined();
  });

  it('accepts exactly 10 steps (maximum)', async () => {
    mockDb.query.mockResolvedValue({ rows: [MOCK_FUNNEL] });
    const steps = Array.from({ length: 10 }, (_, i) => ({ screen: `/step-${i}` }));
    await expect(createFunnel(PROJECT_ID, 'Max Funnel', steps)).resolves.toBeDefined();
  });
});

// ── deleteFunnel ──────────────────────────────────────────────────────────────

describe('deleteFunnel', () => {
  it('deletes successfully when funnel exists', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: FUNNEL_ID }] });
    await expect(deleteFunnel(PROJECT_ID, FUNNEL_ID)).resolves.toBeUndefined();
  });

  it('throws NOT_FOUND when funnel does not exist', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await expect(deleteFunnel(PROJECT_ID, 'nonexistent')).rejects.toThrow('NOT_FOUND');
  });

  it('scopes delete to project_id to prevent cross-project deletion', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ id: FUNNEL_ID }] });
    await deleteFunnel(PROJECT_ID, FUNNEL_ID);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/project_id = \$2/);
  });
});

// ── computeFunnelResults ──────────────────────────────────────────────────────

describe('computeFunnelResults', () => {
  beforeEach(() => {
    // First query always fetches the funnel
    mockDb.query.mockResolvedValueOnce({ rows: [MOCK_FUNNEL] });
  });

  it('returns correct step counts and conversion percentages', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ count_0: '1000', count_1: '800', count_2: '500' }],
    });

    const result = await computeFunnelResults(PROJECT_ID, FUNNEL_ID, 30);

    expect(result.total_sessions).toBe(1000);
    expect(result.steps).toHaveLength(3);

    expect(result.steps[0]).toMatchObject({ count: 1000, conversion_pct: 100, dropoff: 0,   dropoff_pct: 0  });
    expect(result.steps[1]).toMatchObject({ count: 800,  conversion_pct: 80,  dropoff: 200, dropoff_pct: 20 });
    expect(result.steps[2]).toMatchObject({ count: 500,  conversion_pct: 50,  dropoff: 300, dropoff_pct: 37 });
  });

  it('maps screen names to step results', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ count_0: '100', count_1: '80', count_2: '60' }],
    });

    const result = await computeFunnelResults(PROJECT_ID, FUNNEL_ID, 30);

    expect(result.steps[0].screen).toBe('/home');
    expect(result.steps[1].screen).toBe('/signup');
    expect(result.steps[2].screen).toBe('/dashboard');
  });

  it('returns empty steps when funnel has no steps', async () => {
    // Reset and return empty funnel
    mockDb.query.mockReset();
    mockDb.query.mockResolvedValueOnce({
      rows: [{ ...MOCK_FUNNEL, steps: [] }],
    });

    const result = await computeFunnelResults(PROJECT_ID, FUNNEL_ID, 30);

    expect(result.steps).toEqual([]);
    expect(result.total_sessions).toBe(0);
    // No computation query should run
    expect(mockDb.query).toHaveBeenCalledTimes(1);
  });

  it('handles complete drop-off (all users lost at step 2)', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ count_0: '500', count_1: '0', count_2: '0' }],
    });

    const result = await computeFunnelResults(PROJECT_ID, FUNNEL_ID, 30);

    expect(result.steps[1].count).toBe(0);
    expect(result.steps[1].conversion_pct).toBe(0);
    expect(result.steps[1].dropoff_pct).toBe(100);
  });

  it('builds CTE query with correct number of steps', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ count_0: '100', count_1: '80', count_2: '60' }],
    });

    await computeFunnelResults(PROJECT_ID, FUNNEL_ID, 30);

    const computeQuery = mockDb.query.mock.calls[1][0] as string;
    expect(computeQuery).toMatch(/WITH/);
    expect(computeQuery).toMatch(/step_0/);
    expect(computeQuery).toMatch(/step_1/);
    expect(computeQuery).toMatch(/step_2/);
    // Each step after the first must JOIN on previous step
    expect(computeQuery).toMatch(/JOIN step_0/);
    expect(computeQuery).toMatch(/JOIN step_1/);
  });

  it('filters events by navigate and screen_view types', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ count_0: '100', count_1: '80', count_2: '60' }],
    });

    await computeFunnelResults(PROJECT_ID, FUNNEL_ID, 30);

    const computeQuery = mockDb.query.mock.calls[1][0] as string;
    expect(computeQuery).toMatch(/navigate/);
    expect(computeQuery).toMatch(/screen_view/);
  });

  it('throws NOT_FOUND when funnel does not exist', async () => {
    mockDb.query.mockReset();
    mockDb.query.mockResolvedValue({ rows: [] });

    await expect(computeFunnelResults(PROJECT_ID, 'nonexistent', 30)).rejects.toThrow('NOT_FOUND');
  });
});
