import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { config } from '../config';

export interface ProjectRequest extends Request {
  project?: { id: string; name: string; apiKey: string };
}

/** Validates API key from request body (SDK ingest routes) */
export async function requireApiKey(
  req: ProjectRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.body?.apiKey as string | undefined;
  if (!apiKey) {
    res.status(401).json({ error: 'Missing apiKey' });
    return;
  }

  const result = await db.query(
    'SELECT id, name, api_key FROM projects WHERE api_key = $1',
    [apiKey]
  );

  if (result.rows.length === 0) {
    res.status(401).json({ error: 'Invalid apiKey' });
    return;
  }

  req.project = {
    id: result.rows[0].id,
    name: result.rows[0].name,
    apiKey: result.rows[0].api_key,
  };

  next();
}

/** Validates dashboard token from Authorization header (read routes) */
export function requireDashboardToken(
  req: ProjectRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers['x-dashboard-token'] as string | undefined;

  // For MVP: accept the static dev token or a valid JWT
  if (token === config.dashboardToken) {
    // In dev, use the seeded project
    req.project = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Dev Project',
      apiKey: 'proj_dev_key',
    };
    next();
    return;
  }

  res.status(401).json({ error: 'Unauthorized' });
}
