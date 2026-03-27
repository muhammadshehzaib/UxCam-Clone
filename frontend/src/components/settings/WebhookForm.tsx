'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWebhook } from '@/lib/api';

const EVENT_OPTIONS = [
  { value: 'crash.new',           label: 'New crash detected' },
  { value: 'rage_click.session',  label: 'Session with rage clicks' },
  { value: 'freeze.session',      label: 'Session with UI freeze' },
];

interface WebhookFormProps {
  projectId: string;
}

export default function WebhookForm({ projectId: _projectId }: WebhookFormProps) {
  const router = useRouter();
  const [name,      setName]      = useState('');
  const [url,       setUrl]       = useState('');
  const [events,    setEvents]    = useState<string[]>([]);
  const [secret,    setSecret]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  function toggleEvent(ev: string) {
    setEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim())  { setError('Name is required'); return; }
    if (!url.trim())   { setError('URL is required'); return; }
    if (!events.length){ setError('Select at least one event'); return; }

    setSaving(true);
    try {
      await createWebhook(name.trim(), url.trim(), events, secret || undefined);
      setName(''); setUrl(''); setEvents([]); setSecret('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add Webhook</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Slack alerts"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            data-testid="webhook-name-input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">URL</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://hooks.slack.com/..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            data-testid="webhook-url-input" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">Trigger on</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={events.includes(opt.value)}
                onChange={() => toggleEvent(opt.value)}
                className="rounded border-slate-300 text-brand-600"
                data-testid={`webhook-event-${opt.value}`} />
              <span className="text-sm text-slate-600">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Secret <span className="text-slate-400">(optional — for HMAC signature)</span>
        </label>
        <input type="text" value={secret} onChange={(e) => setSecret(e.target.value)}
          placeholder="my-secret-key"
          className="w-full max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          data-testid="webhook-secret-input" />
      </div>

      {error && <p className="text-xs text-red-600" data-testid="webhook-error">{error}</p>}

      <button type="submit" disabled={saving}
        className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
        data-testid="webhook-save-button">
        {saving ? 'Saving…' : 'Add Webhook'}
      </button>
    </form>
  );
}
