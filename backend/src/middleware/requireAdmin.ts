import { Response, NextFunction } from 'express';
import { db } from '../db/client';
import { ProjectRequest } from './auth';

/**
 * Verifies the authenticated user holds the 'admin' role for the active project.
 * Must be used after requireDashboardToken (which sets req.user and req.project).
 */
export async function requireProjectAdmin(
  req: ProjectRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await db.query(
      `SELECT role FROM user_projects
       WHERE user_id = $1 AND project_id = $2`,
      [req.user!.id, req.project!.id]
    );

    if (result.rows[0]?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (err) {
    console.error('requireProjectAdmin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
