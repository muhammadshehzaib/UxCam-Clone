import jwt from 'jsonwebtoken';
import { db } from '../db/client';
import { config } from '../config';

const JWT_EXPIRY = '7d';

export interface Project {
  id:         string;
  name:       string;
  api_key:    string;
  role:       string;
  created_at: string;
}

function signToken(sub: string, projectId: string, email: string): string {
  return jwt.sign({ sub, projectId, email }, config.dashboardJwtSecret, { expiresIn: JWT_EXPIRY });
}

function generateApiKey(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}

export async function listUserProjects(userId: string): Promise<Project[]> {
  const result = await db.query(
    `SELECT p.id, p.name, p.api_key, up.role, p.created_at
     FROM projects p
     JOIN user_projects up ON up.project_id = p.id
     WHERE up.user_id = $1
     ORDER BY p.created_at ASC`,
    [userId]
  );
  return result.rows as Project[];
}

export async function createProject(
  userId: string,
  email: string,
  name: string
): Promise<{ project: Project; token: string }> {
  if (!name.trim()) throw new Error('INVALID_NAME');

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const projectResult = await client.query(
      `INSERT INTO projects (name, api_key) VALUES ($1, $2) RETURNING id, name, api_key, created_at`,
      [name.trim(), `proj_${generateApiKey()}`]
    );
    const project = projectResult.rows[0] as Omit<Project, 'role'>;

    await client.query(
      `INSERT INTO user_projects (user_id, project_id, role) VALUES ($1, $2, 'admin')`,
      [userId, project.id]
    );

    await client.query('COMMIT');

    const token = signToken(userId, project.id, email);
    return { project: { ...project, role: 'admin' }, token };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function regenerateApiKey(projectId: string): Promise<string> {
  const newKey = `proj_${generateApiKey()}`;
  const result = await db.query(
    `UPDATE projects SET api_key = $1 WHERE id = $2 RETURNING api_key`,
    [newKey, projectId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
  return result.rows[0].api_key as string;
}

export async function switchProject(
  userId: string,
  email: string,
  projectId: string
): Promise<{ token: string; project: Project }> {
  // Verify user has access to this project
  const result = await db.query(
    `SELECT p.id, p.name, p.api_key, up.role, p.created_at
     FROM projects p
     JOIN user_projects up ON up.project_id = p.id
     WHERE up.user_id = $1 AND p.id = $2`,
    [userId, projectId]
  );

  if (result.rows.length === 0) throw new Error('FORBIDDEN');

  const project = result.rows[0] as Project;
  const token   = signToken(userId, project.id, email);
  return { token, project };
}
