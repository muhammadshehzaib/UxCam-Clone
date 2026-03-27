'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvite } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { InviteInfo } from '@/types';
import { Users } from 'lucide-react';

interface InviteAcceptClientProps {
  token:       string;
  inviteInfo:  InviteInfo | null;
  error?:      string;
}

export default function InviteAcceptClient({ token, inviteInfo, error: initialError }: InviteAcceptClientProps) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(initialError ?? null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const result = await acceptInvite(token);
      setToken(result.token);
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept invite');
      setLoading(false);
    }
  }

  if (error || !inviteInfo) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <p className="text-slate-500 text-sm" data-testid="invite-error-message">
            {error ?? 'This invite is invalid or has expired.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">
          U
        </div>
        <h1 className="text-2xl font-bold text-slate-900">You&apos;re invited</h1>
        <p className="text-slate-500 text-sm mt-1">
          {inviteInfo.invited_by} invited you to join
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Project info */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <Users size={14} className="text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800" data-testid="project-name">
              {inviteInfo.project_name}
            </p>
            <p className="text-xs text-slate-500">
              You&apos;ll join as <strong>{inviteInfo.role}</strong>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Accepting as <span className="font-medium text-slate-700">{inviteInfo.email}</span>
        </p>

        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
          data-testid="accept-invite-button"
        >
          {loading ? 'Joining…' : `Join ${inviteInfo.project_name}`}
        </button>

        {error && (
          <p className="text-xs text-red-600 text-center" data-testid="accept-error">{error}</p>
        )}
      </div>
    </div>
  );
}
