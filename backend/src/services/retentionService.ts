import { db } from '../db/client';
import { redis } from '../db/redis';

export interface RetentionSummary {
  total_users: number;
  d1_pct:      number;
  d7_pct:      number;
  d30_pct:     number;
}

export interface RetentionCohort {
  cohort_week: string;
  total:       number;
  d1_pct:      number;
  d7_pct:      number;
  d30_pct:     number;
}

export interface RetentionData {
  summary: RetentionSummary;
  cohorts: RetentionCohort[];
}

export async function getRetention(
  projectId: string,
  days: number
): Promise<RetentionData> {
  const cacheKey = `retention:${projectId}:${days}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as RetentionData;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [summaryResult, cohortsResult] = await Promise.all([
    // ── Overall summary ──────────────────────────────────────────────────────
    db.query(
      `SELECT
         COUNT(*)                                                                                           AS total_users,
         ROUND(COUNT(*) FILTER (WHERE last_seen_at >= first_seen_at + INTERVAL '1 day')::numeric
               / NULLIF(COUNT(*), 0) * 100, 1)                                                             AS d1_pct,
         ROUND(COUNT(*) FILTER (WHERE last_seen_at >= first_seen_at + INTERVAL '7 days')::numeric
               / NULLIF(COUNT(*), 0) * 100, 1)                                                             AS d7_pct,
         ROUND(COUNT(*) FILTER (WHERE last_seen_at >= first_seen_at + INTERVAL '30 days')::numeric
               / NULLIF(COUNT(*), 0) * 100, 1)                                                             AS d30_pct
       FROM app_users
       WHERE project_id = $1
         AND first_seen_at >= $2`,
      [projectId, since]
    ),

    // ── Weekly cohorts ────────────────────────────────────────────────────────
    db.query(
      `WITH cohorts AS (
         SELECT
           DATE_TRUNC('week', first_seen_at)                                                               AS cohort_week,
           COUNT(*)                                                                                         AS total,
           COUNT(*) FILTER (WHERE last_seen_at >= first_seen_at + INTERVAL '1 day')                       AS d1,
           COUNT(*) FILTER (WHERE last_seen_at >= first_seen_at + INTERVAL '7 days')                      AS d7,
           COUNT(*) FILTER (WHERE last_seen_at >= first_seen_at + INTERVAL '30 days')                     AS d30
         FROM app_users
         WHERE project_id = $1
           AND first_seen_at >= $2
         GROUP BY cohort_week
         ORDER BY cohort_week ASC
       )
       SELECT
         cohort_week,
         total,
         ROUND(d1::numeric  / NULLIF(total, 0) * 100, 1) AS d1_pct,
         ROUND(d7::numeric  / NULLIF(total, 0) * 100, 1) AS d7_pct,
         ROUND(d30::numeric / NULLIF(total, 0) * 100, 1) AS d30_pct
       FROM cohorts`,
      [projectId, since]
    ),
  ]);

  const row = summaryResult.rows[0];

  const summary: RetentionSummary = {
    total_users: parseInt(row.total_users, 10),
    d1_pct:      parseFloat(row.d1_pct  ?? '0'),
    d7_pct:      parseFloat(row.d7_pct  ?? '0'),
    d30_pct:     parseFloat(row.d30_pct ?? '0'),
  };

  const cohorts: RetentionCohort[] = cohortsResult.rows.map((r) => ({
    cohort_week: r.cohort_week as string,
    total:       parseInt(r.total,   10),
    d1_pct:      parseFloat(r.d1_pct  ?? '0'),
    d7_pct:      parseFloat(r.d7_pct  ?? '0'),
    d30_pct:     parseFloat(r.d30_pct ?? '0'),
  }));

  const data: RetentionData = { summary, cohorts };
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 600); // 10-min TTL

  return data;
}
