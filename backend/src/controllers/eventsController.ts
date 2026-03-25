import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as eventsService from '../services/eventsService';

export async function getSessionEvents(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const events = await eventsService.getEventsBySession(
      req.project!.id,
      req.params.sessionId as string
    );
    res.json({ data: events });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    console.error('getSessionEvents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
