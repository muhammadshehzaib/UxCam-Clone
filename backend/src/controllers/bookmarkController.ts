import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as bookmarkService from '../services/bookmarkService';

export async function toggleBookmark(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const result = await bookmarkService.toggleBookmark(
      req.user!.id,
      req.params.id,
      req.project!.id
    );
    res.json({ data: result });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    console.error('toggleBookmark error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listBookmarks(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const sessions = await bookmarkService.listBookmarkedSessions(
      req.user!.id,
      req.project!.id
    );
    res.json({ data: sessions });
  } catch (err) {
    console.error('listBookmarks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
