import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as usersService from '../services/usersService';

export async function listUsers(req: ProjectRequest, res: Response): Promise<void> {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const minDurationSec = req.query.minDuration
    ? parseInt(req.query.minDuration as string, 10)
    : undefined;

  try {
    const result = await usersService.listUsers(req.project!.id, page, limit, {
      device:      req.query.device   as string | undefined,
      os:          req.query.os       as string | undefined,
      browser:     req.query.browser  as string | undefined,
      minDuration: minDurationSec ? minDurationSec * 1000 : undefined,
      rageClick:   req.query.rageClick === 'true' ? true : undefined,
      search:      req.query.search   as string | undefined,
      traitFilters: req.query.traitKey
        ? (Array.isArray(req.query.traitKey) ? req.query.traitKey : [req.query.traitKey]).map((key, i) => {
            const val = Array.isArray(req.query.traitVal) ? req.query.traitVal[i] : req.query.traitVal;
            return { key: String(key), value: String(val ?? '') };
          }).filter((f) => f.key && f.value)
        : undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTraitKeys(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const keys = await usersService.getTraitKeys(req.project!.id);
    res.json({ data: keys });
  } catch (err) {
    console.error('getTraitKeys error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function exportUsers(req: ProjectRequest, res: Response): Promise<void> {
  const minDurationSec = req.query.minDuration
    ? parseInt(req.query.minDuration as string, 10)
    : undefined;

  try {
    const csv = await usersService.exportUsersAsCsv(req.project!.id, {
      device:      req.query.device   as string | undefined,
      os:          req.query.os       as string | undefined,
      browser:     req.query.browser  as string | undefined,
      minDuration: minDurationSec ? minDurationSec * 1000 : undefined,
      rageClick:   req.query.rageClick === 'true' ? true : undefined,
      search:      req.query.search   as string | undefined,
    });

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users-${date}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('exportUsers error:', err);
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
