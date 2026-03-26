import { db } from '../../db/client';
import { redis } from '../../db/redis';
import { getScreenFlow } from '../../services/screenFlowService';

const mockDb    = db    as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock };

const PROJECT_ID = 'proj-1';

const MOCK_EDGES = [
  { from_screen: '/home',     to_screen: '/products', transition_count: '562' },
  { from_screen: '/products', to_screen: '/cart',     transition_count: '341' },
  { from_screen: '/home',     to_screen: '/signup',   transition_count: '189' },
];

const MOCK_NODES = [
  { screen_name: '/home',     total_visits: '1000', entry_count: '600', exit_count: '50'  },
  { screen_name: '/products', total_visits:  '750', entry_count:  '80', exit_count: '200' },
  { screen_name: '/cart',     total_visits:  '400', entry_count:  '20', exit_count: '150' },
];

describe('screenFlowService', () => {
  beforeEach(() => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
  });

  // ── Cache ──────────────────────────────────────────────────────────────────

  it('serves cached result without hitting DB on cache hit', async () => {
    const cached = { edges: [], nodes: [], total_transitions: 0 };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await getScreenFlow(PROJECT_ID, 30);

    expect(result).toEqual(cached);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('writes result to Redis with 5-minute TTL on cache miss', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: MOCK_EDGES })
      .mockResolvedValueOnce({ rows: MOCK_NODES });

    await getScreenFlow(PROJECT_ID, 30);

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('screen-flow:'),
      expect.any(String),
      'EX',
      300
    );
  });

  it('uses days in the cache key so different periods are cached separately', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await getScreenFlow(PROJECT_ID, 7);
    expect(mockRedis.get).toHaveBeenCalledWith(`screen-flow:${PROJECT_ID}:7`);
  });

  // ── Edges ──────────────────────────────────────────────────────────────────

  it('returns edges ordered by transition_count DESC', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: MOCK_EDGES })
      .mockResolvedValueOnce({ rows: MOCK_NODES });

    const result = await getScreenFlow(PROJECT_ID, 30);

    expect(result.edges[0].transition_count).toBe(562);
    expect(result.edges[1].transition_count).toBe(341);
    expect(result.edges[2].transition_count).toBe(189);
  });

  it('parses edge transition_count as integer', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: MOCK_EDGES })
      .mockResolvedValueOnce({ rows: MOCK_NODES });

    const result = await getScreenFlow(PROJECT_ID, 30);

    expect(typeof result.edges[0].transition_count).toBe('number');
  });

  it('edges query uses LEAD window function to find next screen', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await getScreenFlow(PROJECT_ID, 30);

    const edgesQuery = mockDb.query.mock.calls[0][0] as string;
    expect(edgesQuery).toMatch(/LEAD\(screen_name\)/);
    expect(edgesQuery).toMatch(/PARTITION BY session_id/);
    expect(edgesQuery).toMatch(/ORDER BY elapsed_ms/);
  });

  it('edges query filters out self-transitions', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await getScreenFlow(PROJECT_ID, 30);

    const edgesQuery = mockDb.query.mock.calls[0][0] as string;
    expect(edgesQuery).toMatch(/screen_name != next_screen/);
  });

  it('edges query filters type IN navigate screen_view', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await getScreenFlow(PROJECT_ID, 30);

    const edgesQuery = mockDb.query.mock.calls[0][0] as string;
    expect(edgesQuery).toMatch(/navigate/);
    expect(edgesQuery).toMatch(/screen_view/);
  });

  it('edges query filters null screen_name values', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await getScreenFlow(PROJECT_ID, 30);

    const edgesQuery = mockDb.query.mock.calls[0][0] as string;
    expect(edgesQuery).toMatch(/screen_name IS NOT NULL/);
  });

  it('edges query filters by project_id and timestamp', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await getScreenFlow(PROJECT_ID, 30);

    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(PROJECT_ID);
    expect(params[1]).toBeInstanceOf(Date);
  });

  // ── Nodes ──────────────────────────────────────────────────────────────────

  it('returns correct entry_count for each node', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: MOCK_EDGES })
      .mockResolvedValueOnce({ rows: MOCK_NODES });

    const result = await getScreenFlow(PROJECT_ID, 30);
    const home = result.nodes.find((n) => n.screen === '/home')!;

    expect(home.entry_count).toBe(600);
  });

  it('returns correct exit_count for each node', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: MOCK_EDGES })
      .mockResolvedValueOnce({ rows: MOCK_NODES });

    const result = await getScreenFlow(PROJECT_ID, 30);
    const products = result.nodes.find((n) => n.screen === '/products')!;

    expect(products.exit_count).toBe(200);
  });

  it('returns correct total_visits for each node', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: MOCK_EDGES })
      .mockResolvedValueOnce({ rows: MOCK_NODES });

    const result = await getScreenFlow(PROJECT_ID, 30);
    const home = result.nodes.find((n) => n.screen === '/home')!;

    expect(home.total_visits).toBe(1000);
  });

  it('nodes query uses ROW_NUMBER for entry and exit detection', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await getScreenFlow(PROJECT_ID, 30);

    const nodesQuery = mockDb.query.mock.calls[1][0] as string;
    expect(nodesQuery).toMatch(/ROW_NUMBER\(\)/);
    expect(nodesQuery).toMatch(/rn_asc/);
    expect(nodesQuery).toMatch(/rn_desc/);
  });

  // ── Total transitions ──────────────────────────────────────────────────────

  it('total_transitions equals sum of all edge counts', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: MOCK_EDGES })
      .mockResolvedValueOnce({ rows: MOCK_NODES });

    const result = await getScreenFlow(PROJECT_ID, 30);

    expect(result.total_transitions).toBe(562 + 341 + 189);
  });

  it('returns empty arrays when no navigation events exist', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    const result = await getScreenFlow(PROJECT_ID, 30);

    expect(result.edges).toEqual([]);
    expect(result.nodes).toEqual([]);
    expect(result.total_transitions).toBe(0);
  });
});
