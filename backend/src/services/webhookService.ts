import { createHmac } from 'crypto';
import { db } from '../db/client';

export type WebhookEventType =
  | 'crash.new'
  | 'rage_click.session'
  | 'freeze.session'
  | 'webhook.test';

export interface Webhook {
  id:         string;
  project_id: string;
  name:       string;
  url:        string;
  events:     WebhookEventType[];
  secret:     string | null;
  enabled:    boolean;
  created_at: string;
}

export const SUPPORTED_EVENTS: WebhookEventType[] = [
  'crash.new',
  'rage_click.session',
  'freeze.session',
];

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listWebhooks(projectId: string): Promise<Webhook[]> {
  const result = await db.query(
    `SELECT id, project_id, name, url, events, secret, enabled, created_at
     FROM webhooks WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  );
  return result.rows as Webhook[];
}

export async function createWebhook(
  projectId: string,
  name:      string,
  url:       string,
  events:    string[],
  secret?:   string
): Promise<Webhook> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('INVALID_URL');
  }
  if (!events.length) throw new Error('NO_EVENTS');

  const validEvents = events.filter((e) => (SUPPORTED_EVENTS as string[]).includes(e));
  if (!validEvents.length) throw new Error('NO_EVENTS');

  const result = await db.query(
    `INSERT INTO webhooks (project_id, name, url, events, secret)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, project_id, name, url, events, secret, enabled, created_at`,
    [projectId, name.trim(), url, validEvents, secret ?? null]
  );
  return result.rows[0] as Webhook;
}

export async function updateWebhook(
  projectId: string,
  webhookId: string,
  updates: Partial<Pick<Webhook, 'name' | 'url' | 'events' | 'secret' | 'enabled'>>
): Promise<Webhook> {
  const result = await db.query(
    `UPDATE webhooks
     SET name    = COALESCE($3, name),
         url     = COALESCE($4, url),
         events  = COALESCE($5, events),
         secret  = COALESCE($6, secret),
         enabled = COALESCE($7, enabled)
     WHERE id = $1 AND project_id = $2
     RETURNING id, project_id, name, url, events, secret, enabled, created_at`,
    [webhookId, projectId,
     updates.name ?? null,
     updates.url  ?? null,
     updates.events ? JSON.stringify(updates.events) : null,
     updates.secret ?? null,
     updates.enabled ?? null]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
  return result.rows[0] as Webhook;
}

export async function deleteWebhook(projectId: string, webhookId: string): Promise<void> {
  const result = await db.query(
    `DELETE FROM webhooks WHERE id = $1 AND project_id = $2 RETURNING id`,
    [webhookId, projectId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
}

// ── Delivery ──────────────────────────────────────────────────────────────────

function sign(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export async function deliverWebhook(
  webhook: Pick<Webhook, 'url' | 'secret'>,
  event:   WebhookEventType,
  projectId: string,
  data:    Record<string, unknown>
): Promise<void> {
  const payload = JSON.stringify({
    event,
    project_id: projectId,
    timestamp:  new Date().toISOString(),
    data,
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (webhook.secret) {
    headers['X-Signature'] = `sha256=${sign(webhook.secret, payload)}`;
  }

  await fetch(webhook.url, { method: 'POST', headers, body: payload });
}

/** Fire all enabled webhooks for a project that subscribe to the given event. */
export async function fireWebhooks(
  projectId: string,
  event:     WebhookEventType,
  data:      Record<string, unknown>
): Promise<void> {
  const result = await db.query(
    `SELECT id, url, secret FROM webhooks
     WHERE project_id = $1 AND enabled = true AND $2 = ANY(events)`,
    [projectId, event]
  );

  await Promise.allSettled(
    result.rows.map((wh) => deliverWebhook(wh as Webhook, event, projectId, data))
  );
}
