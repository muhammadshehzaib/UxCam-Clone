import { db } from '../db/client';
import { redis } from '../db/redis';

export interface ScreenFlowEdge {
  from_screen:       string;
  to_screen:         string;
  transition_count:  number;
}

export interface ScreenFlowNode {
  screen:       string;
  total_visits: number;
  entry_count:  number;
  exit_count:   number;
}

export interface ScreenFlowData {
  edges:             ScreenFlowEdge[];
  nodes:             ScreenFlowNode[];
  total_transitions: number;
}

export async function getScreenFlow(
  projectId: string,
  days: number
): Promise<ScreenFlowData> {
  const cacheKey = `screen-flow:${projectId}:${days}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as ScreenFlowData;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [edgesResult, nodesResult] = await Promise.all([
    // ── Transitions: pair each screen with the next screen in the session ──
    db.query(
      `WITH ordered_screens AS (
         SELECT
           session_id,
           screen_name,
           elapsed_ms,
           LEAD(screen_name) OVER (
             PARTITION BY session_id ORDER BY elapsed_ms
           ) AS next_screen
         FROM events
         WHERE project_id = $1
           AND type IN ('navigate', 'screen_view')
           AND screen_name IS NOT NULL
           AND timestamp >= $2
       )
       SELECT
         screen_name  AS from_screen,
         next_screen  AS to_screen,
         COUNT(*)     AS transition_count
       FROM ordered_screens
       WHERE next_screen IS NOT NULL
         AND screen_name != next_screen
       GROUP BY screen_name, next_screen
       ORDER BY transition_count DESC
       LIMIT 50`,
      [projectId, since]
    ),

    // ── Nodes: entry/exit/total visits per screen ──
    db.query(
      `WITH ordered_screens AS (
         SELECT
           session_id,
           screen_name,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY elapsed_ms)      AS rn_asc,
           ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY elapsed_ms DESC) AS rn_desc
         FROM events
         WHERE project_id = $1
           AND type IN ('navigate', 'screen_view')
           AND screen_name IS NOT NULL
           AND timestamp >= $2
       )
       SELECT
         screen_name,
         COUNT(*)                             AS total_visits,
         COUNT(*) FILTER (WHERE rn_asc  = 1) AS entry_count,
         COUNT(*) FILTER (WHERE rn_desc = 1) AS exit_count
       FROM ordered_screens
       GROUP BY screen_name
       ORDER BY total_visits DESC
       LIMIT 20`,
      [projectId, since]
    ),
  ]);

  const edges: ScreenFlowEdge[] = edgesResult.rows.map((r) => ({
    from_screen:      r.from_screen as string,
    to_screen:        r.to_screen   as string,
    transition_count: parseInt(r.transition_count, 10),
  }));

  const nodes: ScreenFlowNode[] = nodesResult.rows.map((r) => ({
    screen:       r.screen_name  as string,
    total_visits: parseInt(r.total_visits, 10),
    entry_count:  parseInt(r.entry_count,  10),
    exit_count:   parseInt(r.exit_count,   10),
  }));

  const total_transitions = edges.reduce((sum, e) => sum + e.transition_count, 0);

  const data: ScreenFlowData = { edges, nodes, total_transitions };
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 300); // 5-min TTL

  return data;
}
