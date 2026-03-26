import { db } from '../../db/client';
import { detectRageClicks, analyzeAndStoreRageClicks } from '../../services/rageClickService';

const mockDb = db as unknown as { query: jest.Mock };

// ─── detectRageClicks (pure function) ────────────────────────────────────────

describe('detectRageClicks', () => {
  it('returns empty array when no clicks', () => {
    expect(detectRageClicks([])).toEqual([]);
  });

  it('returns empty array when fewer than 3 clicks total', () => {
    const clicks = [
      { elapsed_ms: 0,   x: 0.5, y: 0.5 },
      { elapsed_ms: 100, x: 0.5, y: 0.5 },
    ];
    expect(detectRageClicks(clicks)).toEqual([]);
  });

  it('detects a simple rage click cluster (3 clicks, same spot, within 500ms)', () => {
    const clicks = [
      { elapsed_ms: 0,   x: 0.5, y: 0.5 },
      { elapsed_ms: 150, x: 0.5, y: 0.5 },
      { elapsed_ms: 300, x: 0.5, y: 0.5 },
    ];
    const result = detectRageClicks(clicks);
    expect(result).toHaveLength(1);
    expect(result[0].elapsed_ms).toBe(0);
    expect(result[0].count).toBe(3);
  });

  it('records x/y coordinates of the anchor click', () => {
    const clicks = [
      { elapsed_ms: 0,   x: 0.3, y: 0.7 },
      { elapsed_ms: 100, x: 0.3, y: 0.7 },
      { elapsed_ms: 200, x: 0.3, y: 0.7 },
    ];
    const result = detectRageClicks(clicks);
    expect(result[0].x).toBe(0.3);
    expect(result[0].y).toBe(0.7);
  });

  it('does not flag 3 clicks spread more than 500ms apart', () => {
    const clicks = [
      { elapsed_ms: 0,    x: 0.5, y: 0.5 },
      { elapsed_ms: 600,  x: 0.5, y: 0.5 },
      { elapsed_ms: 1200, x: 0.5, y: 0.5 },
    ];
    expect(detectRageClicks(clicks)).toHaveLength(0);
  });

  it('does not flag clicks that are spatially far apart', () => {
    const clicks = [
      { elapsed_ms: 0,   x: 0.1, y: 0.1 },
      { elapsed_ms: 100, x: 0.9, y: 0.9 },
      { elapsed_ms: 200, x: 0.5, y: 0.5 },
    ];
    expect(detectRageClicks(clicks)).toHaveLength(0);
  });

  it('counts 5 rapid same-spot clicks as a single cluster with count=5', () => {
    const clicks = Array.from({ length: 5 }, (_, i) => ({
      elapsed_ms: i * 80,
      x: 0.5,
      y: 0.5,
    }));
    const result = detectRageClicks(clicks);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(5);
  });

  it('detects two separate rage click clusters in the same session', () => {
    const clicks = [
      // Cluster 1 at ~0ms, position (0.2, 0.2)
      { elapsed_ms: 0,    x: 0.2, y: 0.2 },
      { elapsed_ms: 100,  x: 0.2, y: 0.2 },
      { elapsed_ms: 200,  x: 0.2, y: 0.2 },
      // Gap
      { elapsed_ms: 5000, x: 0.8, y: 0.8 },
      // Cluster 2 at ~6000ms, position (0.8, 0.8)
      { elapsed_ms: 6000, x: 0.8, y: 0.8 },
      { elapsed_ms: 6100, x: 0.8, y: 0.8 },
      { elapsed_ms: 6200, x: 0.8, y: 0.8 },
    ];
    const result = detectRageClicks(clicks);
    expect(result).toHaveLength(2);
    expect(result[0].elapsed_ms).toBe(0);
    expect(result[1].elapsed_ms).toBe(6000);
  });

  it('does not double-count clicks already used in a cluster', () => {
    const clicks = [
      { elapsed_ms: 0,   x: 0.5, y: 0.5 },
      { elapsed_ms: 100, x: 0.5, y: 0.5 },
      { elapsed_ms: 200, x: 0.5, y: 0.5 },
      { elapsed_ms: 300, x: 0.5, y: 0.5 },
    ];
    // Should be 1 cluster with count 4, not 2 clusters
    const result = detectRageClicks(clicks);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(4);
  });

  it('accepts clicks just within the 0.1 distance threshold', () => {
    // Distance = sqrt(0.07^2 + 0.07^2) ≈ 0.099 < 0.1
    const clicks = [
      { elapsed_ms: 0,   x: 0.5,  y: 0.5  },
      { elapsed_ms: 100, x: 0.57, y: 0.57 },
      { elapsed_ms: 200, x: 0.5,  y: 0.5  },
    ];
    expect(detectRageClicks(clicks)).toHaveLength(1);
  });

  it('rejects clicks just outside the 0.1 distance threshold', () => {
    // Distance = sqrt(0.08^2 + 0.08^2) ≈ 0.113 > 0.1
    const clicks = [
      { elapsed_ms: 0,   x: 0.5,  y: 0.5  },
      { elapsed_ms: 100, x: 0.58, y: 0.58 },
      { elapsed_ms: 200, x: 0.5,  y: 0.5  },
    ];
    expect(detectRageClicks(clicks)).toHaveLength(0);
  });
});

// ─── analyzeAndStoreRageClicks (DB integration) ───────────────────────────────

describe('analyzeAndStoreRageClicks', () => {
  const SESSION_ID = 'sess-1';
  const PROJECT_ID = 'proj-1';

  it('does not update session when no rage clicks detected', async () => {
    mockDb.query.mockResolvedValue({ rows: [] }); // no clicks returned

    await analyzeAndStoreRageClicks(SESSION_ID, PROJECT_ID);

    // Only the SELECT query should have run — no UPDATE
    expect(mockDb.query).toHaveBeenCalledTimes(1);
    expect(mockDb.query.mock.calls[0][0]).toMatch(/SELECT elapsed_ms/);
  });

  it('updates session metadata when rage clicks are detected', async () => {
    const rageClicks = [
      { elapsed_ms: 0,   x: 0.5, y: 0.5 },
      { elapsed_ms: 100, x: 0.5, y: 0.5 },
      { elapsed_ms: 200, x: 0.5, y: 0.5 },
    ];
    mockDb.query
      .mockResolvedValueOnce({ rows: rageClicks })   // SELECT clicks
      .mockResolvedValueOnce({ rows: [] });           // UPDATE sessions

    await analyzeAndStoreRageClicks(SESSION_ID, PROJECT_ID);

    expect(mockDb.query).toHaveBeenCalledTimes(2);
    const updateCall = mockDb.query.mock.calls[1];
    expect(updateCall[0]).toMatch(/UPDATE sessions/);
    expect(updateCall[0]).toMatch(/metadata/);

    const metadata = JSON.parse(updateCall[1][0] as string);
    expect(metadata.rage_click).toBe(true);
    expect(metadata.rage_click_count).toBe(3);
    expect(metadata.rage_click_timestamps).toEqual([0]);
  });

  it('queries only click events with non-null x and y', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });

    await analyzeAndStoreRageClicks(SESSION_ID, PROJECT_ID);

    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/type = 'click'/);
    expect(sql).toMatch(/x IS NOT NULL/);
    expect(sql).toMatch(/y IS NOT NULL/);
    expect(sql).toMatch(/ORDER BY elapsed_ms ASC/);
  });

  it('stores all rage cluster timestamps when multiple clusters detected', async () => {
    const clicks = [
      { elapsed_ms: 0,    x: 0.2, y: 0.2 },
      { elapsed_ms: 100,  x: 0.2, y: 0.2 },
      { elapsed_ms: 200,  x: 0.2, y: 0.2 },
      { elapsed_ms: 6000, x: 0.8, y: 0.8 },
      { elapsed_ms: 6100, x: 0.8, y: 0.8 },
      { elapsed_ms: 6200, x: 0.8, y: 0.8 },
    ];
    mockDb.query
      .mockResolvedValueOnce({ rows: clicks })
      .mockResolvedValueOnce({ rows: [] });

    await analyzeAndStoreRageClicks(SESSION_ID, PROJECT_ID);

    const metadata = JSON.parse(mockDb.query.mock.calls[1][1][0] as string);
    expect(metadata.rage_click_timestamps).toEqual([0, 6000]);
    expect(metadata.rage_click_count).toBe(6);
  });
});
