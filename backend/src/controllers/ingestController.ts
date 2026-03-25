import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as ingestService from '../services/ingestService';

export async function sessionStart(req: ProjectRequest, res: Response): Promise<void> {
  const { sessionId, anonymousId, startedAt, device = {} } = req.body;

  if (!sessionId || !anonymousId) {
    res.status(400).json({ error: 'sessionId and anonymousId are required' });
    return;
  }

  try {
    await ingestService.startSession(req.project!.id, sessionId, anonymousId, startedAt, device);
    res.status(201).json({ data: { sessionId } });
  } catch (err) {
    console.error('sessionStart error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function batchIngest(req: ProjectRequest, res: Response): Promise<void> {
  const { sessionId, events } = req.body;

  if (!sessionId || !Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: 'sessionId and non-empty events array required' });
    return;
  }

  try {
    const inserted = await ingestService.ingestBatch(req.project!.id, sessionId, events);
    res.json({ data: { inserted } });
  } catch (err) {
    console.error('batchIngest error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sessionEnd(req: ProjectRequest, res: Response): Promise<void> {
  const { sessionId, endedAt } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  try {
    const durationMs = await ingestService.endSession(req.project!.id, sessionId, endedAt);
    res.json({ data: { durationMs } });
  } catch (err) {
    console.error('sessionEnd error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function identify(req: ProjectRequest, res: Response): Promise<void> {
  const { anonymousId, userId, traits = {} } = req.body;

  if (!anonymousId) {
    res.status(400).json({ error: 'anonymousId is required' });
    return;
  }

  try {
    const id = await ingestService.identifyUser(req.project!.id, anonymousId, userId ?? null, traits);
    res.json({ data: { userId: id } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('identify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
