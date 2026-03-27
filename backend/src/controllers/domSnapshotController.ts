import { Request, Response } from 'express';
import { db } from '../db/client';
import { ProjectRequest } from '../middleware';
import * as domSnapshotService from '../services/domSnapshotService';

/** POST /api/v1/ingest/dom — receives DOM frames from the SDK. */
export async function ingestDOM(req: Request, res: Response): Promise<void> {
  const { sessionId, anonymousId, apiKey, frames } = req.body;

  if (!sessionId || !anonymousId || !apiKey) {
    res.status(400).json({ error: 'sessionId, anonymousId and apiKey are required' });
    return;
  }

  if (!Array.isArray(frames) || frames.length === 0) {
    res.status(400).json({ error: 'frames must be a non-empty array' });
    return;
  }

  // Resolve project from API key (same pattern as ingestService)
  const projectResult = await db.query(
    'SELECT id FROM projects WHERE api_key = $1',
    [apiKey]
  );
  if (projectResult.rows.length === 0) {
    res.status(401).json({ error: 'Invalid apiKey' });
    return;
  }
  const projectId = projectResult.rows[0].id as string;

  try {
    // Normalize frames — data may arrive as object or string
    const normalized = frames.map((f: Record<string, unknown>) => ({
      type:      String(f.type ?? 'mutation'),
      elapsedMs: Number(f.elapsedMs ?? 0),
      data:      typeof f === 'string' ? f : JSON.stringify(f),
    }));

    await domSnapshotService.storeDOMFrames(sessionId, projectId, normalized);
    res.json({ data: { stored: normalized.length } });
  } catch (err) {
    console.error('ingestDOM error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** GET /api/v1/sessions/:id/dom — returns all DOM frames for replay. */
export async function getDOMFrames(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const frames = await domSnapshotService.getDOMFrames(req.params.id, req.project!.id);
    res.json({ data: frames });
  } catch (err) {
    console.error('getDOMFrames error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
