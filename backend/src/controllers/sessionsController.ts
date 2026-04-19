import * as sessionsService from '../services/sessionsService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listSessions(req: any, res: any): Promise<void> {
  const page  = Math.max(1, parseInt(req.query?.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit as string) || 20));

  const rawUserId = req.query?.userId as string | undefined;
  if (rawUserId && !UUID_REGEX.test(rawUserId)) {
    res.status(400).json({ error: 'Invalid userId format' });
    return;
  }

  try {
    const minDurationSec = req.query?.minDuration ? parseInt(req.query?.minDuration as string, 10) : undefined;

    const result = await sessionsService.listSessions(req.project?.id || req.user?.projectId, page, limit, {
      userId:      rawUserId,
      device:      req.query?.device      as string | undefined,
      os:          req.query?.os          as string | undefined,
      browser:     req.query?.browser     as string | undefined,
      dateFrom:    req.query?.dateFrom    as string | undefined,
      dateTo:      req.query?.dateTo      as string | undefined,
      minDuration: minDurationSec ? minDurationSec * 1000 : undefined,
      rageClick:   req.query?.rageClick === 'true' ? true : undefined,
      tags:        req.query?.tags ? (req.query?.tags as string).split(',').filter(Boolean) : undefined,
      screen:      req.query?.screen as string | undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('listSessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function exportSessions(req: any, res: any): Promise<void> {
  try {
    const minDurationSec = req.query?.minDuration
      ? parseInt(req.query?.minDuration as string, 10)
      : undefined;

    const csv = await sessionsService.exportSessionsAsCsv(req.project?.id || req.user?.projectId, {
      userId:      req.query?.userId      as string | undefined,
      device:      req.query?.device      as string | undefined,
      os:          req.query?.os          as string | undefined,
      browser:     req.query?.browser     as string | undefined,
      dateFrom:    req.query?.dateFrom    as string | undefined,
      dateTo:      req.query?.dateTo      as string | undefined,
      minDuration: minDurationSec ? minDurationSec * 1000 : undefined,
      rageClick:   req.query?.rageClick === 'true' ? true : undefined,
    });

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sessions-${date}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('exportSessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSession(req: any, res: any): Promise<void> {
  try {
    const session = await sessionsService.getSessionById(req.project?.id || req.user?.projectId, req.params?.id as string);
    console.log(`[API] getSession: id=${req.params?.id}, projectId=${req.project?.id || req.user?.projectId}, found=${!!session}`);
    res.json({ data: session });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    console.error('getSession error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
