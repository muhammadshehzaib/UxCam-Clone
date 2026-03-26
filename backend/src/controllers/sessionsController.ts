import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as sessionsService from '../services/sessionsService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listSessions(req: ProjectRequest, res: Response): Promise<void> {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const rawUserId = req.query.userId as string | undefined;
  if (rawUserId && !UUID_REGEX.test(rawUserId)) {
    res.status(400).json({ error: 'Invalid userId format' });
    return;
  }

  try {
    const minDurationSec = req.query.minDuration ? parseInt(req.query.minDuration as string, 10) : undefined;

    const result = await sessionsService.listSessions(req.project!.id, page, limit, {
      userId:      rawUserId,
      device:      req.query.device as string | undefined,
      os:          req.query.os as string | undefined,
      dateFrom:    req.query.dateFrom as string | undefined,
      dateTo:      req.query.dateTo as string | undefined,
      minDuration: minDurationSec ? minDurationSec * 1000 : undefined, // convert s → ms
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
