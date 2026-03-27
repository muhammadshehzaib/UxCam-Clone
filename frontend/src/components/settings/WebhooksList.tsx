'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Send } from 'lucide-react';
import { deleteWebhook, testWebhook } from '@/lib/api';
import { Webhook } from '@/types';

interface WebhooksListProps { webhooks: Webhook[] }

export default function WebhooksList({ webhooks }: WebhooksListProps) {
  const router   = useRouter();
  const [testing, setTesting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleTest(id: string) {
    setTesting(id);
    try { await testWebhook(id); } catch { /* ignore */ } finally { setTesting(null); }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try { await deleteWebhook(id); router.refresh(); } catch { /* ignore */ } finally { setDeleting(null); }
  }

  if (webhooks.length === 0) {
    return <p className="text-xs text-slate-400 py-2" data-testid="webhooks-empty">No webhooks yet</p>;
  }

  return (
    <div className="space-y-2" data-testid="webhooks-list">
      {webhooks.map((wh) => (
        <div key={wh.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-slate-100 bg-slate-50" data-testid={`webhook-item-${wh.id}`}>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{wh.name}</p>
            <p className="text-xs text-slate-500 truncate max-w-xs">{wh.url}</p>
            <div className="flex gap-1 mt-1">
              {wh.events.map((ev) => (
                <span key={ev} className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{ev}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <span className={`text-xs font-medium ${wh.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {wh.enabled ? 'Active' : 'Disabled'}
            </span>
            <button onClick={() => handleTest(wh.id)} disabled={!!testing}
              className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-40 transition-colors"
              aria-label="Send test" data-testid={`test-webhook-${wh.id}`}>
              <Send size={13} />
            </button>
            <button onClick={() => handleDelete(wh.id)} disabled={!!deleting}
              className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
              aria-label="Delete webhook" data-testid={`delete-webhook-${wh.id}`}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
