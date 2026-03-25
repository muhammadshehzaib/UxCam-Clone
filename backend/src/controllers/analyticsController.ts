import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as analyticsService from '../services/analyticsService';

export async function getSummary(req: ProjectRequest, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));

  try {
    const summary = await analyticsService.getSummary(req.project!.id, days);
    res.json({ data: summary });
  } catch (err) {
    console.error('getSummary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSessionsOverTime(req: ProjectRequest, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));

  try {
    const data = await analyticsService.getSessionsOverTime(req.project!.id, days);
    res.json({ data });
  } catch (err) {
    console.error('getSessionsOverTime error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
