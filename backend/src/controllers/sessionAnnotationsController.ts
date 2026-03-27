import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as annotationsService from '../services/sessionAnnotationsService';

export async function updateNote(req: ProjectRequest, res: Response): Promise<void> {
  const { note } = req.body;

  if (note === undefined || note === null) {
    res.status(400).json({ error: 'note field is required' });
    return;
  }

  try {
    await annotationsService.updateNote(req.project!.id, req.params.id, String(note));
    res.json({ data: { ok: true } });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    console.error('updateNote error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTags(req: ProjectRequest, res: Response): Promise<void> {
  const { tags } = req.body;

  if (!Array.isArray(tags)) {
    res.status(400).json({ error: 'tags must be an array' });
    return;
  }

  try {
    await annotationsService.updateTags(req.project!.id, req.params.id, tags);
    res.json({ data: { ok: true } });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    console.error('updateTags error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
