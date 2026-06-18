import { Request, Response } from 'express';
import { db } from '../db/client';
import { ProjectRequest } from '../middleware';
import * as screenFrameService from '../services/screenFrameService';

/** POST /api/v1/ingest/screen — receives screenshot frames from the mobile SDKs. */
export async function ingestScreen(req: Request, res: Response): Promise<void> {
  const { sessionId, anonymousId, apiKey, frames } = req.body;

  if (!sessionId || !anonymousId || !apiKey) {
    res.status(400).json({ error: 'sessionId, anonymousId and apiKey are required' });
    return;
  }

  if (!Array.isArray(frames) || frames.length === 0) {
    res.status(400).json({ error: 'frames must be a non-empty array' });
    return;
  }

  // Resolve project from API key (same pattern as domSnapshotController)
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
    const normalized = frames.map((f: Record<string, unknown>) => ({
      elapsedMs: Number(f.elapsedMs ?? 0),
      data:      String(f.data ?? ''),
      width:     Number(f.width ?? 0),
      height:    Number(f.height ?? 0),
    }));

    const stored = await screenFrameService.storeScreenFrames(sessionId, projectId, normalized);
    res.json({ data: { stored } });
  } catch (err) {
    console.error('ingestScreen error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** GET /api/v1/sessions/:id/screens — returns all screenshot frames for replay. */
export async function getScreenFrames(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const frames = await screenFrameService.getScreenFrames(req.params.id, req.project!.id);
    res.json({ data: frames });
  } catch (err) {
    console.error('getScreenFrames error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
