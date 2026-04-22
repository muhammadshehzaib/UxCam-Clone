import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { db } from '../db/client';
import { config } from '../config';

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY    = '7d';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuthTokenPayload {
  sub:       string;
  projectId: string;
  email:     string;
}

export interface AuthResult {
  token: string;
  user: {
    id:        string;
    email:     string;
    name:      string | null;
    projectId: string;
  };
}

function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.dashboardJwtSecret, { expiresIn: JWT_EXPIRY });
}

export async function register(
  email: string,
  password: string,
  projectName: string,
  name?: string
): Promise<AuthResult> {
  if (!EMAIL_REGEX.test(email)) throw new Error('INVALID_EMAIL');
  if (password.length < 8)      throw new Error('WEAK_PASSWORD');
  if (!projectName.trim())      throw new Error('INVALID_PROJECT_NAME');

  // Check for duplicate email
  const existing = await db.query(
    'SELECT id FROM dashboard_users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (existing.rows.length > 0) throw new Error('DUPLICATE_EMAIL');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create project and user in a transaction
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const projectResult = await client.query(
      `INSERT INTO projects (name, api_key)
       VALUES ($1, $2)
       RETURNING id, name`,
      [projectName.trim(), `proj_${generateApiKey()}`]
    );
    const project = projectResult.rows[0];

    const userResult = await client.query(
      `INSERT INTO dashboard_users (project_id, email, password_hash, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, project_id`,
      [project.id, email.toLowerCase(), passwordHash, name?.trim() ?? null]
    );
    const user = userResult.rows[0];

    // Add user to user_projects join table
    await client.query(
      `INSERT INTO user_projects (user_id, project_id, role) VALUES ($1, $2, 'admin')`,
      [user.id, project.id]
    );

    await client.query('COMMIT');

    const token = signToken({ sub: user.id, projectId: project.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, projectId: project.id },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  if (!email || !password) throw new Error('MISSING_FIELDS');

  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.password_hash,
            -- Prefer the user_projects join table (authoritative for multi-project access)
            -- Fall back to the legacy dashboard_users.project_id column
            COALESCE(
              (SELECT up.project_id FROM user_projects up WHERE up.user_id = u.id ORDER BY up.project_id LIMIT 1),
              u.project_id
            ) AS project_id
     FROM dashboard_users u
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) throw new Error('INVALID_CREDENTIALS');

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  if (!user.project_id) throw new Error('NO_PROJECT');

  const token = signToken({ sub: user.id, projectId: user.project_id, email: user.email });
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, projectId: user.project_id },
  };
}

export async function getMe(userId: string): Promise<{
  id: string; email: string; name: string | null; projectId: string; projectName: string;
}> {
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.project_id, p.name AS project_name
     FROM dashboard_users u
     LEFT JOIN projects p ON p.id = u.project_id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) throw new Error('NOT_FOUND');

  const row = result.rows[0];
  return {
    id:          row.id,
    email:       row.email,
    name:        row.name,
    projectId:   row.project_id,
    projectName: row.project_name,
  };
}

function generateApiKey(): string {
  return randomBytes(24).toString('hex'); // 48 hex chars, 192 bits of entropy
}
