import { config } from '../config';

export interface MailOptions {
  to:      string;
  subject: string;
  html:    string;
}

/**
 * Sends an email. Uses nodemailer if SMTP is configured, otherwise
 * logs to console (development / unconfigured fallback).
 */
export async function sendMail(opts: MailOptions): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST) {
    // Graceful dev fallback — log instead of sending
    console.log(
      `[mailer] SMTP not configured — would send:\nTo: ${opts.to}\nSubject: ${opts.subject}\n`
    );
    return;
  }

  // Dynamic import so nodemailer is not required at startup
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(SMTP_PORT ?? '587', 10),
    secure: SMTP_PORT === '465',
    auth:   SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  await transporter.sendMail({
    from:    SMTP_FROM ?? 'noreply@uxclone.app',
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
  });
}
