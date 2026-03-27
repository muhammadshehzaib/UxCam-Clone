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
  days: number,
  device?: string        // optional: 'mobile' | 'tablet' | 'desktop'
): Promise<HeatmapPoint[]> {
  const cacheKey = `heatmap:${projectId}:${screenName}:${days}:${device ?? 'all'}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // When filtering by device we need to JOIN with sessions
  const deviceJoin   = device ? `JOIN sessions ses ON ses.id = e.session_id` : '';
  const deviceClause = device ? `AND ses.device_type = $4` : '';
  const queryParams  = device
    ? [projectId, screenName, since, device]
    : [projectId, screenName, since];

  const result = await db.query(
    `SELECT
       ROUND(e.x::numeric, 2) AS x,
       ROUND(e.y::numeric, 2) AS y,
       COUNT(*) AS count
     FROM events e
     ${deviceJoin}
     WHERE e.project_id = $1
       AND e.type = 'click'
       AND e.screen_name = $2
       AND e.timestamp >= $3
       AND e.x IS NOT NULL
       AND e.y IS NOT NULL
       ${deviceClause}
     GROUP BY ROUND(e.x::numeric, 2), ROUND(e.y::numeric, 2)
     ORDER BY count DESC`,
    queryParams
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
