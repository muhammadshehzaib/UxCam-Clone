import { Request, Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as funnelService from '../services/funnelService';

export async function listFunnels(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const funnels = await funnelService.listFunnels(req.project!.id);
    res.json({ data: funnels });
  } catch (err) {
    console.error('listFunnels error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createFunnel(req: ProjectRequest, res: Response): Promise<void> {
  const { name, steps } = req.body;

  if (!name || !Array.isArray(steps)) {
    res.status(400).json({ error: 'name and steps array are required' });
    return;
  }

  try {
    const funnel = await funnelService.createFunnel(req.project!.id, name, steps);
    res.status(201).json({ data: funnel });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_NAME') {
        res.status(400).json({ error: 'Funnel name cannot be empty' });
        return;
      }
      if (err.message === 'TOO_FEW_STEPS') {
        res.status(400).json({ error: 'Funnel requires at least 2 steps' });
        return;
      }
      if (err.message === 'TOO_MANY_STEPS') {
        res.status(400).json({ error: 'Funnel cannot have more than 10 steps' });
        return;
      }
      if (err.message === 'INVALID_STEP') {
        res.status(400).json({ error: 'Each step must have a non-empty screen name' });
        return;
      }
    }
    console.error('createFunnel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteFunnel(req: ProjectRequest, res: Response): Promise<void> {
  try {
    await funnelService.deleteFunnel(req.project!.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Funnel not found' });
      return;
    }
    console.error('deleteFunnel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getFunnelResults(req: Request & ProjectRequest, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));

  try {
    const results = await funnelService.computeFunnelResults(req.project!.id, req.params.id, days);
    res.json({ data: results });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Funnel not found' });
      return;
    }
    console.error('getFunnelResults error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
