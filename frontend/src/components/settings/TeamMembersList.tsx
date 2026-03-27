'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Copy } from 'lucide-react';
import { removeTeamMember } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { TeamMember, PendingInvite } from '@/types';

interface TeamMembersListProps {
  projectId:  string;
  members:    TeamMember[];
  invites:    PendingInvite[];
  currentUserId: string;
}

function getCurrentUserId(): string {
  const token = getToken();
  if (!token) return '';
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    return (JSON.parse(atob(parts[1])) as Record<string, string>).sub ?? '';
  } catch { return ''; }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function TeamMembersList({ projectId, members, invites }: TeamMembersListProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const myId = getCurrentUserId();

  async function handleRemove(userId: string) {
    setRemoving(userId);
    try {
      await removeTeamMember(projectId, userId);
      router.refresh();
    } catch { /* silently ignore */ }
    finally { setRemoving(null); }
  }

  return (
    <div className="space-y-6">
      {/* Active members */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Members ({members.length})
        </h3>
        <div className="space-y-1" data-testid="members-list">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50">
              <div className="min-w-0">
                <span className="text-sm text-slate-800 font-medium">{m.email}</span>
                {m.name && <span className="text-xs text-slate-400 ml-2">{m.name}</span>}
                {m.user_id === myId && <span className="text-xs text-slate-400 ml-2">(you)</span>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.role === 'admin'
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  data-testid={`role-badge-${m.user_id}`}
                >
                  {m.role}
                </span>
                {m.user_id !== myId && (
                  <button
                    onClick={() => handleRemove(m.user_id)}
                    disabled={removing === m.user_id}
                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                    aria-label={`Remove ${m.email}`}
                    data-testid={`remove-member-${m.user_id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Pending Invites ({invites.length})
          </h3>
          <div className="space-y-1" data-testid="invites-list">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-amber-50 border border-amber-100">
                <div className="min-w-0">
                  <span className="text-sm text-slate-700">{inv.email}</span>
                  <span className="text-xs text-slate-400 ml-2">
                    expires {new Date(inv.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(inv.invite_url)}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 transition-colors ml-4 flex-shrink-0"
                  data-testid={`copy-invite-${inv.id}`}
                >
                  <Copy size={12} />
                  Copy Link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
