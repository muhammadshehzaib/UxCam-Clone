'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, UserPlus } from 'lucide-react';
import { createInvite } from '@/lib/api';
import { PendingInvite } from '@/types';

interface InviteFormProps {
  projectId: string;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function InviteForm({ projectId }: InviteFormProps) {
  const router = useRouter();
  const [email,   setEmail]   = useState('');
  const [role,    setRole]    = useState<'viewer' | 'admin'>('viewer');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [created, setCreated] = useState<PendingInvite | null>(null);

  function validate(): string | null {
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const invite = await createInvite(projectId, email.trim(), role);
      setCreated(invite);
      setEmail('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Invite Member
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              data-testid="invite-email-input"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'viewer' | 'admin')}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              data-testid="invite-role-select"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
            data-testid="invite-submit-button"
          >
            <UserPlus size={14} />
            {loading ? 'Sending…' : 'Invite'}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-600" data-testid="invite-error">{error}</p>
        )}
      </form>

      {/* Invite URL result */}
      {created && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg" data-testid="invite-success">
          <p className="text-xs font-semibold text-emerald-700 mb-2">
            Invite created! Share this link:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-slate-700 bg-white px-2 py-1.5 rounded border border-slate-200 truncate" data-testid="invite-url">
              {created.invite_url}
            </code>
            <button
              onClick={() => copyToClipboard(created.invite_url)}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 transition-colors flex-shrink-0"
              data-testid="copy-invite-url"
            >
              <Copy size={12} />
              Copy
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Expires {new Date(created.expires_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
