import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as sessionsService from '../services/sessionsService';

export async function listSessions(req: ProjectRequest, res: Response): Promise<void> {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  try {
    const result = await sessionsService.listSessions(req.project!.id, page, limit, {
      userId:   req.query.userId as string | undefined,
      device:   req.query.device as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo:   req.query.dateTo as string | undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('listSessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSession(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const session = await sessionsService.getSessionById(req.project!.id, req.params.id as string);
    res.json({ data: session });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    console.error('getSession error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
