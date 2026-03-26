import { db } from '../db/client';

export interface FunnelStep {
  screen: string;
}

export interface Funnel {
  id: string;
  project_id: string;
  name: string;
  steps: FunnelStep[];
  created_at: string;
}

export interface FunnelStepResult {
  screen: string;
  count: number;
  dropoff: number;       // sessions lost vs previous step
  dropoff_pct: number;   // % lost vs previous step (0–100)
  conversion_pct: number; // % of first step that reached this step
}

export interface FunnelResults {
  funnel: Funnel;
  total_sessions: number;
  steps: FunnelStepResult[];
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listFunnels(projectId: string): Promise<Funnel[]> {
  const result = await db.query(
    `SELECT id, project_id, name, steps, created_at
     FROM funnels
     WHERE project_id = $1
     ORDER BY created_at DESC`,
    [projectId]
  );
  return result.rows as Funnel[];
}

export async function createFunnel(
  projectId: string,
  name: string,
  steps: FunnelStep[]
): Promise<Funnel> {
  if (!name.trim()) throw new Error('INVALID_NAME');
  if (steps.length < 2) throw new Error('TOO_FEW_STEPS');
  if (steps.length > 10) throw new Error('TOO_MANY_STEPS');
  if (steps.some((s) => !s.screen?.trim())) throw new Error('INVALID_STEP');

  const result = await db.query(
    `INSERT INTO funnels (project_id, name, steps)
     VALUES ($1, $2, $3)
     RETURNING id, project_id, name, steps, created_at`,
    [projectId, name.trim(), JSON.stringify(steps)]
  );
  return result.rows[0] as Funnel;
}

export async function deleteFunnel(projectId: string, funnelId: string): Promise<void> {
  const result = await db.query(
    `DELETE FROM funnels WHERE id = $1 AND project_id = $2 RETURNING id`,
    [funnelId, projectId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
}

export async function getFunnelById(projectId: string, funnelId: string): Promise<Funnel> {
  const result = await db.query(
    `SELECT id, project_id, name, steps, created_at
     FROM funnels WHERE id = $1 AND project_id = $2`,
    [funnelId, projectId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
  return result.rows[0] as Funnel;
}

// ── Computation ───────────────────────────────────────────────────────────────

/**
 * Builds a dynamic CTE chain where each step counts sessions that reached
 * that screen *after* reaching all previous screens (in order, same session).
 */
export async function computeFunnelResults(
  projectId: string,
  funnelId: string,
  days: number
): Promise<FunnelResults> {
  const funnel = await getFunnelById(projectId, funnelId);
  const { steps } = funnel;

  if (steps.length === 0) {
    return { funnel, total_sessions: 0, steps: [] };
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Build parameterised CTE chain
  // params[0] = projectId, params[1] = since, params[2..] = screen names
  const params: unknown[] = [projectId, since];
  const cteParts: string[] = [];
  const countSelects: string[] = [];

  steps.forEach((step, i) => {
    params.push(step.screen);
    const screenParam = `$${params.length}`;

    if (i === 0) {
      cteParts.push(`
step_${i} AS (
  SELECT session_id, MIN(elapsed_ms) AS reached_at
  FROM events
  WHERE project_id = $1
    AND screen_name = ${screenParam}
    AND type IN ('navigate', 'screen_view')
    AND timestamp >= $2
  GROUP BY session_id
)`);
    } else {
      cteParts.push(`
step_${i} AS (
  SELECT e.session_id, MIN(e.elapsed_ms) AS reached_at
  FROM events e
  JOIN step_${i - 1} prev ON e.session_id = prev.session_id
    AND e.elapsed_ms > prev.reached_at
  WHERE e.project_id = $1
    AND e.screen_name = ${screenParam}
    AND e.type IN ('navigate', 'screen_view')
  GROUP BY e.session_id
)`);
    }

    countSelects.push(`(SELECT COUNT(*) FROM step_${i}) AS count_${i}`);
  });

  const sql = `WITH ${cteParts.join(',')} SELECT ${countSelects.join(', ')}`;
  const result = await db.query(sql, params);
  const row = result.rows[0];

  const counts: number[] = steps.map((_, i) => parseInt(row[`count_${i}`], 10));
  const firstCount = counts[0] ?? 0;

  const stepResults: FunnelStepResult[] = steps.map((step, i) => {
    const count = counts[i];
    const prevCount = i === 0 ? count : counts[i - 1];
    const dropoff = prevCount - count;
    const dropoff_pct = prevCount > 0 ? Math.round((dropoff / prevCount) * 100) : 0;
    const conversion_pct = firstCount > 0 ? Math.round((count / firstCount) * 100) : 0;

    return { screen: step.screen, count, dropoff, dropoff_pct, conversion_pct };
  });

  return { funnel, total_sessions: firstCount, steps: stepResults };
}
