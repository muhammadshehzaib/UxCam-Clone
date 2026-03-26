import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as projectService from '../services/projectService';

export async function listProjects(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const projects = await projectService.listUserProjects(req.user!.id);
    res.json({ data: projects });
  } catch (err) {
    console.error('listProjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createProject(req: ProjectRequest, res: Response): Promise<void> {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  try {
    const result = await projectService.createProject(req.user!.id, req.user!.email, name);
    res.status(201).json({ data: result });
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_NAME') {
      res.status(400).json({ error: 'Project name cannot be empty' });
      return;
    }
    console.error('createProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function switchProject(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const result = await projectService.switchProject(
      req.user!.id,
      req.user!.email,
      req.params.id
    );
    res.json({ data: result });
  } catch (err) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      res.status(403).json({ error: 'Access denied to this project' });
      return;
    }
    console.error('switchProject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
