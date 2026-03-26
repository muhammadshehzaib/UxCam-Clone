import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as screenFlowService from '../services/screenFlowService';

export async function getScreenFlow(req: ProjectRequest, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));

  try {
    const data = await screenFlowService.getScreenFlow(req.project!.id, days);
    res.json({ data });
  } catch (err) {
    console.error('getScreenFlow error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
