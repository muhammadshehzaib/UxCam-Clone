import { db } from '../db/client';

export interface SegmentFilters {
  device?:      string;
  os?:          string;
  browser?:     string;
  minDuration?: number;   // seconds
  rageClick?:   boolean;
  tags?:        string[]; // session tag ids e.g. ['bug', 'important']
}

export interface Segment {
  id:         string;
  project_id: string;
  name:       string;
  filters:    SegmentFilters;
  created_at: string;
}

// Only these keys may be stored — dateFrom/dateTo are dynamic, not saved
const ALLOWED_FILTER_KEYS: (keyof SegmentFilters)[] = [
  'device', 'os', 'browser', 'minDuration', 'rageClick', 'tags',
];

function sanitizeFilters(raw: Record<string, unknown>): SegmentFilters {
  const clean: SegmentFilters = {};
  for (const key of ALLOWED_FILTER_KEYS) {
    if (key in raw && raw[key] !== undefined && raw[key] !== null && raw[key] !== '') {
      (clean as Record<string, unknown>)[key] = raw[key];
    }
  }
  return clean;
}

export async function listSegments(projectId: string): Promise<Segment[]> {
  const result = await db.query(
    `SELECT id, project_id, name, filters, created_at
     FROM segments
     WHERE project_id = $1
     ORDER BY created_at DESC`,
    [projectId]
  );
  return result.rows as Segment[];
}

export async function createSegment(
  projectId: string,
  name: string,
  rawFilters: Record<string, unknown>
): Promise<Segment> {
  if (!name.trim()) throw new Error('INVALID_NAME');

  const filters = sanitizeFilters(rawFilters);
  if (Object.keys(filters).length === 0) throw new Error('NO_FILTERS');

  const result = await db.query(
    `INSERT INTO segments (project_id, name, filters)
     VALUES ($1, $2, $3)
     RETURNING id, project_id, name, filters, created_at`,
    [projectId, name.trim(), JSON.stringify(filters)]
  );
  return result.rows[0] as Segment;
}

export async function updateSegment(
  projectId: string,
  segmentId: string,
  name: string,
  rawFilters: Record<string, unknown>
): Promise<Segment> {
  if (!name.trim()) throw new Error('INVALID_NAME');

  const filters = sanitizeFilters(rawFilters);
  if (Object.keys(filters).length === 0) throw new Error('NO_FILTERS');

  const result = await db.query(
    `UPDATE segments
     SET name = $1, filters = $2
     WHERE id = $3 AND project_id = $4
     RETURNING id, project_id, name, filters, created_at`,
    [name.trim(), JSON.stringify(filters), segmentId, projectId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
  return result.rows[0] as Segment;
}

export async function deleteSegment(projectId: string, segmentId: string): Promise<void> {
  const result = await db.query(
    `DELETE FROM segments WHERE id = $1 AND project_id = $2 RETURNING id`,
    [segmentId, projectId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
}
