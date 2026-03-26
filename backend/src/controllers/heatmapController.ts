import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as heatmapService from '../services/heatmapService';

export async function getHeatmap(req: ProjectRequest, res: Response): Promise<void> {
  const screen = req.query.screen as string | undefined;
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));

  if (!screen) {
    res.status(400).json({ error: 'screen query parameter is required' });
    return;
  }

  try {
    const data = await heatmapService.getHeatmap(req.project!.id, screen, days);
    res.json({ data });
  } catch (err) {
    console.error('getHeatmap error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getScreenNames(req: ProjectRequest, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));

  try {
    const data = await heatmapService.getScreenNames(req.project!.id, days);
    res.json({ data });
  } catch (err) {
    console.error('getScreenNames error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
