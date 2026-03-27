import { Request, Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as teamService from '../services/teamService';

export async function listMembers(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const data = await teamService.listMembers(req.project!.id);
    res.json({ data });
  } catch (err) {
    console.error('listMembers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createInvite(req: ProjectRequest, res: Response): Promise<void> {
  const { email, role = 'viewer' } = req.body;

  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }
  if (!['admin', 'viewer'].includes(role)) {
    res.status(400).json({ error: 'role must be admin or viewer' });
    return;
  }

  try {
    const invite = await teamService.createInvite(
      req.project!.id, req.user!.id, email, role as 'admin' | 'viewer'
    );
    res.status(201).json({ data: invite });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_EMAIL')   { res.status(400).json({ error: 'Invalid email address' }); return; }
      if (err.message === 'ALREADY_MEMBER')  { res.status(409).json({ error: 'User is already a member' }); return; }
      if (err.message === 'INVITE_PENDING')  { res.status(409).json({ error: 'An active invite already exists for this email' }); return; }
    }
    console.error('createInvite error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function removeMember(req: ProjectRequest, res: Response): Promise<void> {
  try {
    await teamService.removeMember(req.project!.id, req.user!.id, req.params.userId);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND')          { res.status(404).json({ error: 'Member not found' }); return; }
      if (err.message === 'CANNOT_REMOVE_SELF') { res.status(400).json({ error: 'You cannot remove yourself' }); return; }
    }
    console.error('removeMember error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getInvite(req: Request, res: Response): Promise<void> {
  try {
    const info = await teamService.getInviteByToken(req.params.token);
    res.json({ data: info });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND')       { res.status(404).json({ error: 'Invite not found' }); return; }
      if (err.message === 'EXPIRED')         { res.status(410).json({ error: 'This invite has expired' }); return; }
      if (err.message === 'ALREADY_ACCEPTED') { res.status(409).json({ error: 'Invite already accepted' }); return; }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function acceptInvite(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const result = await teamService.acceptInvite(
      req.params.token, req.user!.id, req.user!.email
    );
    res.json({ data: result });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND')        { res.status(404).json({ error: 'Invite not found' }); return; }
      if (err.message === 'EXPIRED')          { res.status(410).json({ error: 'This invite has expired' }); return; }
      if (err.message === 'ALREADY_ACCEPTED') { res.status(409).json({ error: 'Invite already accepted' }); return; }
      if (err.message === 'EMAIL_MISMATCH')   { res.status(403).json({ error: 'This invite was sent to a different email address' }); return; }
    }
    console.error('acceptInvite error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
