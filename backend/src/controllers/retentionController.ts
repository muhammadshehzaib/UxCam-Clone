import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as retentionService from '../services/retentionService';

export async function getRetention(req: ProjectRequest, res: Response): Promise<void> {
  // Allow up to 180 days — D30 retention needs 30+ days of history to be meaningful
  const days = Math.min(180, Math.max(1, parseInt(req.query.days as string) || 90));

  try {
    const data = await retentionService.getRetention(req.project!.id, days);
    res.json({ data });
  } catch (err) {
    console.error('getRetention error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
