import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as crashService from '../services/crashService';

export async function getCrashGroups(req: ProjectRequest, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));

  try {
    const data = await crashService.getCrashGroups(req.project!.id, days);
    res.json({ data });
  } catch (err) {
    console.error('getCrashGroups error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCrashTimeline(req: ProjectRequest, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));
  try {
    const data = await crashService.getCrashTimeline(req.project!.id, days);
    res.json({ data });
  } catch (err) {
    console.error('getCrashTimeline error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCrashSessions(req: ProjectRequest, res: Response): Promise<void> {
  const message  = req.query.message as string | undefined;
  const filename = req.query.filename as string | undefined;
  const days     = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));

  if (!message) {
    res.status(400).json({ error: 'message query parameter is required' });
    return;
  }

  try {
    const data = await crashService.getCrashSessions(req.project!.id, message, filename, days);
    res.json({ data });
  } catch (err) {
    console.error('getCrashSessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
