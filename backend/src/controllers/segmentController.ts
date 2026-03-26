import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as segmentService from '../services/segmentService';

export async function listSegments(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const segments = await segmentService.listSegments(req.project!.id);
    res.json({ data: segments });
  } catch (err) {
    console.error('listSegments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createSegment(req: ProjectRequest, res: Response): Promise<void> {
  const { name, filters } = req.body;

  if (!name || typeof filters !== 'object' || filters === null) {
    res.status(400).json({ error: 'name and filters object are required' });
    return;
  }

  try {
    const segment = await segmentService.createSegment(req.project!.id, name, filters);
    res.status(201).json({ data: segment });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_NAME') { res.status(400).json({ error: 'Segment name cannot be empty' }); return; }
      if (err.message === 'NO_FILTERS')   { res.status(400).json({ error: 'At least one filter must be set' }); return; }
    }
    console.error('createSegment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSegment(req: ProjectRequest, res: Response): Promise<void> {
  const { name, filters } = req.body;

  if (!name || typeof filters !== 'object' || filters === null) {
    res.status(400).json({ error: 'name and filters object are required' });
    return;
  }

  try {
    const segment = await segmentService.updateSegment(req.project!.id, req.params.id, name, filters);
    res.json({ data: segment });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND')  { res.status(404).json({ error: 'Segment not found' }); return; }
      if (err.message === 'INVALID_NAME') { res.status(400).json({ error: 'Segment name cannot be empty' }); return; }
      if (err.message === 'NO_FILTERS')   { res.status(400).json({ error: 'At least one filter must be set' }); return; }
    }
    console.error('updateSegment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteSegment(req: ProjectRequest, res: Response): Promise<void> {
  try {
    await segmentService.deleteSegment(req.project!.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }
    console.error('deleteSegment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
