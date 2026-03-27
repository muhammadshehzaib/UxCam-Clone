'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Report {
  id: string; email: string; frequency: string; enabled: boolean; last_sent_at: string | null;
}

interface ReportSubscriptionsProps {
  projectId: string;
  reports:   Report[];
}

async function subscribe(projectId: string, email: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const TOKEN   = typeof document !== 'undefined'
    ? document.cookie.split('; ').find((c) => c.startsWith('uxclone_token='))?.split('=').slice(1).join('=') ?? ''
    : '';
  const res = await fetch(`${API_URL}/api/v1/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ email, frequency: 'weekly' }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Failed');
  }
}

async function unsubscribe(id: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const TOKEN   = typeof document !== 'undefined'
    ? document.cookie.split('; ').find((c) => c.startsWith('uxclone_token='))?.split('=').slice(1).join('=') ?? ''
    : '';
  await fetch(`${API_URL}/api/v1/reports/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
}

export default function ReportSubscriptions({ reports }: ReportSubscriptionsProps) {
  const router  = useRouter();
  const [email, setEmail]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError('Email is required'); return; }
    setSaving(true);
    try {
      await subscribe('', email.trim());
      setEmail('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  }

  async function handleRemove(id: string) {
    await unsubscribe(id);
    router.refresh();
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Weekly Email Reports</h3>
      <p className="text-xs text-slate-400 mb-4">Receive a weekly summary of sessions, crashes, and retention.</p>

      {reports.length > 0 && (
        <div className="space-y-1 mb-4" data-testid="reports-list">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <span className="text-sm text-slate-700">{r.email}</span>
                <span className="text-xs text-slate-400 ml-2">weekly</span>
              </div>
              <button onClick={() => handleRemove(r.id)}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                data-testid={`unsubscribe-${r.id}`}>
                Unsubscribe
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Add email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            data-testid="report-email-input" />
        </div>
        <button type="submit" disabled={saving}
          className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
          data-testid="report-subscribe-button">
          {saving ? '…' : 'Subscribe'}
        </button>
      </form>
      {error && <p className="text-xs text-red-600 mt-2" data-testid="report-error">{error}</p>}
    </div>
  );
}
