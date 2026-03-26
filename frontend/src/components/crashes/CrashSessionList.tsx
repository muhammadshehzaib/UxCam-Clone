import Link from 'next/link';
import { CrashSession } from '@/types';
import { formatDateTime, getDeviceIcon, truncate } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface CrashSessionListProps {
  sessions: CrashSession[];
  loading?: boolean;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function CrashSessionList({ sessions, loading }: CrashSessionListProps) {
  if (loading) {
    return (
      <div className="space-y-2 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center" data-testid="crash-sessions-empty">
        No sessions found for this error
      </p>
    );
  }

  return (
    <div data-testid="crash-session-list">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
            <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Started</th>
            <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Device</th>
            <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Crash at</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sessions.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2">
                {s.external_id
                  ? <span className="text-slate-800 font-medium">{truncate(s.external_id, 24)}</span>
                  : <span className="text-slate-400 font-mono text-xs">{truncate(s.anonymous_id, 16)}</span>
                }
              </td>
              <td className="px-3 py-2 text-slate-500 text-xs">{formatDateTime(s.started_at)}</td>
              <td className="px-3 py-2 text-slate-500 text-xs">
                <span className="mr-1">{getDeviceIcon(s.device_type)}</span>
                {s.os ?? '—'}
              </td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-red-50 text-red-600">
                  {formatElapsed(s.crash_elapsed_ms)}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/sessions/${s.id}?seek=${s.crash_elapsed_ms}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                  data-testid={`replay-link-${s.id}`}
                >
                  <ExternalLink size={11} />
                  Replay at crash
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
