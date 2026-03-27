import Link from 'next/link';
import { Session, TAG_OPTIONS } from '@/types';
import { formatMs, formatDateTime, truncate, getDeviceIcon } from '@/lib/utils';
import { Play } from 'lucide-react';
import BookmarkButton from './BookmarkButton';

interface SessionTableProps {
  sessions:  Session[];
  fromPath?: string; // when set, appended as ?from=<encoded> so session detail shows the right back link
}

export default function SessionTable({ sessions, fromPath }: SessionTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-400">No sessions yet. Use the SDK test harness to generate one.</p>
      </div>
    );
  }

  function sessionHref(id: string): string {
    if (fromPath) return `/sessions/${id}?from=${encodeURIComponent(fromPath)}`;
    return `/sessions/${id}`;
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
              <td className="px-4 py-3 text-slate-600">
                <div className="flex items-center gap-2">
                  {s.event_count}
                  {s.metadata?.rage_click && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">
                      Rage
                    </span>
                  )}
                  {s.metadata?.tags && s.metadata.tags.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      {(s.metadata.tags as string[]).map((tagId) => {
                        const tag = TAG_OPTIONS.find((t) => t.id === tagId);
                        return tag ? (
                          <span
                            key={tagId}
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                            title={tag.label}
                          />
                        ) : null;
                      })}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <BookmarkButton sessionId={s.id} bookmarked={s.is_bookmarked ?? false} />
                  <Link
                    href={sessionHref(s.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Play size={12} />
                    Replay
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
