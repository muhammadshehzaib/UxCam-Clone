import Link from 'next/link';
import { Session } from '@/types';
import { formatMs, formatDateTime, truncate, getDeviceIcon } from '@/lib/utils';
import { Play } from 'lucide-react';

interface SessionTableProps {
  sessions: Session[];
}

export default function SessionTable({ sessions }: SessionTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-400">No sessions yet. Use the SDK test harness to generate one.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Started</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Device</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Events</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sessions.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">
                  {s.external_id
                    ? truncate(s.external_id, 24)
                    : <span className="text-slate-400 font-mono text-xs">{truncate(s.anonymous_id, 16)}</span>
                  }
                </div>
                {s.external_id && (
                  <div className="text-xs text-slate-400 font-mono">{truncate(s.anonymous_id, 16)}</div>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDateTime(s.started_at)}</td>
              <td className="px-4 py-3 text-slate-600">{formatMs(s.duration_ms)}</td>
              <td className="px-4 py-3 text-slate-600">
                <span className="mr-1">{getDeviceIcon(s.device_type)}</span>
                {s.os ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-600">{s.event_count}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/sessions/${s.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg text-xs font-medium transition-colors"
                >
                  <Play size={12} />
                  Replay
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
