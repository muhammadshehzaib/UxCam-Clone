import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';
import { config } from '../config';

const JWT_EXPIRY  = '7d';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface TeamMember {
  user_id:    string;
  email:      string;
  name:       string | null;
  role:       string;
  joined_at:  string;
}

export interface PendingInvite {
  id:         string;
  email:      string;
  role:       string;
  expires_at: string;
  created_at: string;
  invite_url: string;
}

export interface InviteInfo {
  id:           string;
  project_name: string;
  email:        string;
  role:         string;
  invited_by:   string;
  expires_at:   string;
}

function buildInviteUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/invite?token=${token}`;
}

// ── List members ──────────────────────────────────────────────────────────────

export async function listMembers(projectId: string): Promise<{
  members: TeamMember[];
  invites: PendingInvite[];
}> {
  const [membersResult, invitesResult] = await Promise.all([
    db.query(
      `SELECT du.id AS user_id, du.email, du.name, up.role, du.created_at AS joined_at
       FROM user_projects up
       JOIN dashboard_users du ON du.id = up.user_id
       WHERE up.project_id = $1
       ORDER BY du.created_at ASC`,
      [projectId]
    ),
    db.query(
      `SELECT id, email, role, expires_at, created_at, token
       FROM project_invites
       WHERE project_id = $1
         AND accepted_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [projectId]
    ),
  ]);

  const members: TeamMember[] = membersResult.rows as TeamMember[];
  const invites: PendingInvite[] = invitesResult.rows.map((r) => ({
    id:         r.id,
    email:      r.email,
    role:       r.role,
    expires_at: r.expires_at,
    created_at: r.created_at,
    invite_url: buildInviteUrl(r.token),
  }));

  return { members, invites };
}

// ── Create invite ─────────────────────────────────────────────────────────────

export async function createInvite(
  projectId: string,
  invitedByUserId: string,
  email: string,
  role: 'admin' | 'viewer'
): Promise<PendingInvite> {
  if (!EMAIL_REGEX.test(email)) throw new Error('INVALID_EMAIL');

  // Check not already a member
  const memberCheck = await db.query(
    `SELECT up.user_id FROM user_projects up
     JOIN dashboard_users du ON du.id = up.user_id
     WHERE up.project_id = $1 AND LOWER(du.email) = LOWER($2)`,
    [projectId, email]
  );
  if (memberCheck.rows.length > 0) throw new Error('ALREADY_MEMBER');

  // Check no active unexpired invite already exists
  const existingInvite = await db.query(
    `SELECT id FROM project_invites
     WHERE project_id = $1 AND LOWER(email) = LOWER($2)
       AND accepted_at IS NULL AND expires_at > NOW()`,
    [projectId, email]
  );
  if (existingInvite.rows.length > 0) throw new Error('INVITE_PENDING');

  const token = randomUUID();

  const result = await db.query(
    `INSERT INTO project_invites (project_id, email, role, token, invited_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, role, expires_at, created_at`,
    [projectId, email.toLowerCase(), role, token, invitedByUserId]
  );

  const row = result.rows[0];
  return {
    id:         row.id,
    email:      row.email,
    role:       row.role,
    expires_at: row.expires_at,
    created_at: row.created_at,
    invite_url: buildInviteUrl(token),
  };
}

// ── Get invite info (public — no auth needed) ─────────────────────────────────

export async function getInviteByToken(token: string): Promise<InviteInfo> {
  const result = await db.query(
    `SELECT pi.id, pi.email, pi.role, pi.expires_at,
            p.name AS project_name,
            du.email AS invited_by
     FROM project_invites pi
     JOIN projects p ON p.id = pi.project_id
     JOIN dashboard_users du ON du.id = pi.invited_by
     WHERE pi.token = $1`,
    [token]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');

  const row = result.rows[0];
  if (new Date(row.expires_at) < new Date()) throw new Error('EXPIRED');
  if (row.accepted_at)                         throw new Error('ALREADY_ACCEPTED');

  return {
    id:           row.id,
    project_name: row.project_name,
    email:        row.email,
    role:         row.role,
    invited_by:   row.invited_by,
    expires_at:   row.expires_at,
  };
}

// ── Accept invite ─────────────────────────────────────────────────────────────

export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string
): Promise<{ token: string; projectId: string }> {
  const result = await db.query(
    `SELECT pi.id, pi.project_id, pi.email, pi.role, pi.expires_at, pi.accepted_at,
            du.email AS accepting_email
     FROM project_invites pi
     JOIN dashboard_users du ON du.id = $2
     WHERE pi.token = $1`,
    [token, userId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');

  const row = result.rows[0];
  if (new Date(row.expires_at) < new Date()) throw new Error('EXPIRED');
  if (row.accepted_at)                        throw new Error('ALREADY_ACCEPTED');
  if (row.email.toLowerCase() !== userEmail.toLowerCase()) throw new Error('EMAIL_MISMATCH');

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO user_projects (user_id, project_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, project_id) DO NOTHING`,
      [userId, row.project_id, row.role]
    );

    await client.query(
      `UPDATE project_invites SET accepted_at = NOW() WHERE id = $1`,
      [row.id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Issue new JWT scoped to the accepted project
  const jwtToken = jwt.sign(
    { sub: userId, projectId: row.project_id, email: userEmail },
    config.dashboardJwtSecret,
    { expiresIn: JWT_EXPIRY }
  );

  return { token: jwtToken, projectId: row.project_id };
}

// ── Remove member ─────────────────────────────────────────────────────────────

export async function removeMember(
  projectId: string,
  requestingUserId: string,
  targetUserId: string
): Promise<void> {
  if (requestingUserId === targetUserId) throw new Error('CANNOT_REMOVE_SELF');

  const result = await db.query(
    `DELETE FROM user_projects
     WHERE project_id = $1 AND user_id = $2
     RETURNING user_id`,
    [projectId, targetUserId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
}
