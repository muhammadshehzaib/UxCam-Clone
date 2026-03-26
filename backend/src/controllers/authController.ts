import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import * as authService from '../services/authService';
import { AuthTokenPayload } from '../services/authService';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, projectName, name } = req.body;

  if (!email || !password || !projectName) {
    res.status(400).json({ error: 'email, password and projectName are required' });
    return;
  }

  try {
    const result = await authService.register(email, password, projectName, name);
    res.status(201).json({ data: result });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'DUPLICATE_EMAIL')       { res.status(409).json({ error: 'Email already registered' }); return; }
      if (err.message === 'INVALID_EMAIL')         { res.status(400).json({ error: 'Invalid email address' }); return; }
      if (err.message === 'WEAK_PASSWORD')         { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }
      if (err.message === 'INVALID_PROJECT_NAME')  { res.status(400).json({ error: 'Project name cannot be empty' }); return; }
    }
    console.error('register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const result = await authService.login(email, password);
    res.json({ data: result });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_CREDENTIALS') { res.status(401).json({ error: 'Invalid email or password' }); return; }
      if (err.message === 'MISSING_FIELDS')      { res.status(400).json({ error: 'email and password are required' }); return; }
    }
    console.error('login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.dashboardJwtSecret) as AuthTokenPayload;
    const user = await authService.getMe(decoded.sub);
    res.json({ data: user });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(401).json({ error: 'Unauthorized' });
  }
}
