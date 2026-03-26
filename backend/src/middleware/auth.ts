import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';
import { config } from '../config';
import { AuthTokenPayload } from '../services/authService';

export interface ProjectRequest extends Request {
  project?: { id: string; name: string; apiKey: string };
  user?:    { id: string; email: string };
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
    id:     result.rows[0].id,
    name:   result.rows[0].name,
    apiKey: result.rows[0].api_key,
  };

  next();
}

/** Validates dashboard token from Authorization header.
 *  Accepts:
 *   1. Signed JWT (production) — verifies, loads project from DB, sets req.user.
 *   2. Static DASHBOARD_TOKEN env var (development / test backward compat).
 */
export async function requireDashboardToken(
  req: ProjectRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.headers['x-dashboard-token'] as string | undefined);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // ── Backward compat: static dev token ──────────────────────────────────────
  if (token === config.dashboardToken) {
    req.project = {
      id:     '00000000-0000-0000-0000-000000000001',
      name:   'Dev Project',
      apiKey: 'proj_dev_key',
    };
    req.user = { id: '00000000-0000-0000-0000-000000000002', email: 'dev@uxclone.local' };
    next();
    return;
  }

  // ── JWT verification ────────────────────────────────────────────────────────
  try {
    const decoded = jwt.verify(token, config.dashboardJwtSecret) as AuthTokenPayload;

    const result = await db.query(
      'SELECT id, name, api_key FROM projects WHERE id = $1',
      [decoded.projectId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.project = {
      id:     result.rows[0].id,
      name:   result.rows[0].name,
      apiKey: result.rows[0].api_key,
    };
    req.user = { id: decoded.sub, email: decoded.email };

    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
