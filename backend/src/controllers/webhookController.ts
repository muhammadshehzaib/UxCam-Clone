import { Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as webhookService from '../services/webhookService';

export async function listWebhooks(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const data = await webhookService.listWebhooks(req.project!.id);
    res.json({ data });
  } catch (err) {
    console.error('listWebhooks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createWebhook(req: ProjectRequest, res: Response): Promise<void> {
  const { name, url, events, secret } = req.body;
  if (!name || !url || !Array.isArray(events)) {
    res.status(400).json({ error: 'name, url, and events array are required' });
    return;
  }
  try {
    const webhook = await webhookService.createWebhook(req.project!.id, name, url, events, secret);
    res.status(201).json({ data: webhook });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_URL') { res.status(400).json({ error: 'URL must start with http:// or https://' }); return; }
      if (err.message === 'NO_EVENTS')   { res.status(400).json({ error: 'At least one valid event is required' }); return; }
    }
    console.error('createWebhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateWebhook(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const webhook = await webhookService.updateWebhook(req.project!.id, req.params.id, req.body);
    res.json({ data: webhook });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') { res.status(404).json({ error: 'Webhook not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteWebhook(req: ProjectRequest, res: Response): Promise<void> {
  try {
    await webhookService.deleteWebhook(req.project!.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') { res.status(404).json({ error: 'Webhook not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function testWebhook(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const result = await webhookService.listWebhooks(req.project!.id);
    const webhook = result.find((w) => w.id === req.params.id);
    if (!webhook) { res.status(404).json({ error: 'Webhook not found' }); return; }

    await webhookService.deliverWebhook(webhook, 'webhook.test', req.project!.id, {
      message: 'This is a test delivery from UXClone',
    });
    res.json({ data: { ok: true } });
  } catch (err) {
    console.error('testWebhook error:', err);
    res.status(500).json({ error: 'Failed to deliver test webhook' });
  }
}
