import { db } from '../db/client';
import { sendMail } from '../lib/mailer';
import { getSummary } from './analyticsService';
import { getCrashGroups } from './crashService';
import { getRetention } from './retentionService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEEKLY_INTERVAL_DAYS = 7;

export interface EmailReport {
  id:           string;
  project_id:   string;
  email:        string;
  frequency:    string;
  enabled:      boolean;
  last_sent_at: string | null;
  created_at:   string;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listReports(projectId: string): Promise<EmailReport[]> {
  const result = await db.query(
    `SELECT id, project_id, email, frequency, enabled, last_sent_at, created_at
     FROM email_reports WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  );
  return result.rows as EmailReport[];
}

export async function createReport(
  projectId: string,
  email:     string,
  frequency: string = 'weekly'
): Promise<EmailReport> {
  if (!EMAIL_REGEX.test(email)) throw new Error('INVALID_EMAIL');

  const result = await db.query(
    `INSERT INTO email_reports (project_id, email, frequency)
     VALUES ($1, $2, $3)
     RETURNING id, project_id, email, frequency, enabled, last_sent_at, created_at`,
    [projectId, email.toLowerCase(), frequency]
  );
  return result.rows[0] as EmailReport;
}

export async function deleteReport(projectId: string, reportId: string): Promise<void> {
  const result = await db.query(
    `DELETE FROM email_reports WHERE id = $1 AND project_id = $2 RETURNING id`,
    [reportId, projectId]
  );
  if (result.rows.length === 0) throw new Error('NOT_FOUND');
}

// ── Report data ────────────────────────────────────────────────────────────────

export async function buildReportData(projectId: string) {
  const [summary, crashes, retention] = await Promise.all([
    getSummary(projectId, WEEKLY_INTERVAL_DAYS),
    getCrashGroups(projectId, WEEKLY_INTERVAL_DAYS),
    getRetention(projectId, 30),
  ]);
  return { summary, crashes: crashes.slice(0, 5), retention };
}

// ── Email template ─────────────────────────────────────────────────────────────

function buildEmailHtml(projectName: string, data: Awaited<ReturnType<typeof buildReportData>>): string {
  const { summary, crashes, retention } = data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const crashRows = crashes.length > 0
    ? crashes.map((c) => `<li style="margin:4px 0;font-size:13px;color:#475569;">
        <code style="background:#f1f5f9;padding:2px 4px;border-radius:4px;">${c.message.slice(0, 60)}</code>
        — ${c.affected_sessions} session${c.affected_sessions !== 1 ? 's' : ''}
      </li>`).join('')
    : '<li style="color:#94a3b8;font-size:13px;">No crashes this week 🎉</li>';

  return `
<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f8fafc;padding:24px;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
  <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 4px;">UXClone Weekly Report</h1>
  <p style="font-size:14px;color:#64748b;margin:0 0 24px;">${projectName}</p>

  <table style="width:100%;margin-bottom:24px;">
    <tr>
      <td style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px;">
        <div style="font-size:24px;font-weight:700;color:#6366f1;">${summary.totalSessions.toLocaleString()}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Sessions</div>
      </td>
      <td width="8"></td>
      <td style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px;">
        <div style="font-size:24px;font-weight:700;color:#6366f1;">${summary.totalUsers.toLocaleString()}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Users</div>
      </td>
      <td width="8"></td>
      <td style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px;">
        <div style="font-size:24px;font-weight:700;color:#6366f1;">${retention.summary.d7_pct}%</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">D7 Retention</div>
      </td>
    </tr>
  </table>

  <h2 style="font-size:14px;font-weight:600;color:#334155;margin:0 0 8px;">🐛 Top Crashes</h2>
  <ul style="margin:0 0 24px;padding-left:16px;">${crashRows}</ul>

  <a href="${appUrl}/dashboard"
     style="display:block;text-align:center;background:#6366f1;color:#fff;text-decoration:none;padding:12px;border-radius:8px;font-size:14px;font-weight:600;">
    View Full Dashboard →
  </a>

  <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:16px;">
    UXClone · <a href="${appUrl}/settings" style="color:#94a3b8;">Manage email reports</a>
  </p>
</div></body></html>`;
}

// ── Send + trigger ─────────────────────────────────────────────────────────────

export async function sendReport(report: EmailReport, projectName: string): Promise<void> {
  const data = await buildReportData(report.project_id);
  const html = buildEmailHtml(projectName, data);

  await sendMail({
    to:      report.email,
    subject: `UXClone Weekly Report — ${projectName}`,
    html,
  });

  await db.query(
    `UPDATE email_reports SET last_sent_at = NOW() WHERE id = $1`,
    [report.id]
  );
}

export async function triggerDueReports(): Promise<{ sent: number }> {
  // Find enabled reports that are overdue (never sent, or last sent 7+ days ago)
  const result = await db.query(
    `SELECT er.*, p.name AS project_name
     FROM email_reports er
     JOIN projects p ON p.id = er.project_id
     WHERE er.enabled = true
       AND (er.last_sent_at IS NULL
            OR er.last_sent_at <= NOW() - INTERVAL '6 days 23 hours')
     LIMIT 50`
  );

  let sent = 0;
  for (const row of result.rows) {
    try {
      await sendReport(row as EmailReport, row.project_name as string);
      sent++;
    } catch (err) {
      console.error(`Failed to send report to ${(row as EmailReport).email}:`, err);
    }
  }
  return { sent };
}
