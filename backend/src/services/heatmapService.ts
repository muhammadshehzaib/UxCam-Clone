import { db } from '../db/client';
import { redis } from '../db/redis';

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}

export async function getHeatmap(
  projectId: string,
  screenName: string,
  days: number
): Promise<HeatmapPoint[]> {
  const cacheKey = `heatmap:${projectId}:${screenName}:${days}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await db.query(
    `SELECT
       ROUND(x::numeric, 2) AS x,
       ROUND(y::numeric, 2) AS y,
       COUNT(*) AS count
     FROM events
     WHERE project_id = $1
       AND type = 'click'
       AND screen_name = $2
       AND timestamp >= $3
       AND x IS NOT NULL
       AND y IS NOT NULL
     GROUP BY ROUND(x::numeric, 2), ROUND(y::numeric, 2)
     ORDER BY count DESC`,
    [projectId, screenName, since]
  );

  const data: HeatmapPoint[] = result.rows.map((r) => ({
    x: parseFloat(r.x),
    y: parseFloat(r.y),
    count: parseInt(r.count, 10),
  }));

  await redis.set(cacheKey, JSON.stringify(data), 'EX', 300); // 5 min TTL
  return data;
}

export async function getScreenNames(projectId: string, days: number): Promise<string[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await db.query(
    `SELECT DISTINCT screen_name
     FROM events
     WHERE project_id = $1
       AND screen_name IS NOT NULL
       AND timestamp >= $2
     ORDER BY screen_name ASC`,
    [projectId, since]
  );

  return result.rows.map((r) => r.screen_name as string);
}
