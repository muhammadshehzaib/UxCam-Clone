import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as usersService from '../services/usersService';

export async function listUsers(req: ProjectRequest, res: Response): Promise<void> {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  try {
    const result = await usersService.listUsers(req.project!.id, page, limit);
    res.json(result);
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUser(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const user = await usersService.getUserById(req.project!.id, req.params.id as string);
    res.json({ data: user });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('getUser error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUserSessions(req: ProjectRequest, res: Response): Promise<void> {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  try {
    const result = await usersService.listUserSessions(
      req.project!.id, req.params.id as string, page, limit
    );
    res.json(result);
  } catch (err) {
    console.error('getUserSessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
