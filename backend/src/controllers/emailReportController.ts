import { Request, Response } from 'express';
import { ProjectRequest } from '../middleware';
import * as emailReportService from '../services/emailReportService';

export async function listReports(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const data = await emailReportService.listReports(req.project!.id);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createReport(req: ProjectRequest, res: Response): Promise<void> {
  const { email, frequency } = req.body;
  if (!email) { res.status(400).json({ error: 'email is required' }); return; }
  try {
    const report = await emailReportService.createReport(req.project!.id, email, frequency);
    res.status(201).json({ data: report });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_EMAIL') { res.status(400).json({ error: 'Invalid email address' }); return; }
      if (err.message.includes('unique'))   { res.status(409).json({ error: 'This email is already subscribed' }); return; }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteReport(req: ProjectRequest, res: Response): Promise<void> {
  try {
    await emailReportService.deleteReport(req.project!.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') { res.status(404).json({ error: 'Report not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function triggerReports(req: Request, res: Response): Promise<void> {
  const secret = req.headers['x-cron-secret'] as string | undefined;
  if (secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const result = await emailReportService.triggerDueReports();
    res.json({ data: result });
  } catch (err) {
    console.error('triggerReports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function previewReport(req: ProjectRequest, res: Response): Promise<void> {
  try {
    const data = await emailReportService.buildReportData(req.project!.id);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
