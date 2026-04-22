import Link from 'next/link';
import { Session, TAG_OPTIONS } from '@/types';
import { Play } from 'lucide-react';
import BookmarkButton from './BookmarkButton';
import LocalDate from '@/components/ui/LocalDate';
import { formatMs, truncate, getDeviceIcon } from '@/lib/utils';

interface SessionTableProps {
  sessions:  Session[];
  fromPath?: string; // when set, appended as ?from=<encoded> so session detail shows the right back link
}

export default function SessionTable({ sessions, fromPath }: SessionTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="glass-card p-16 text-center animate-slide-up">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-500">
          <Play size={32} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">No sessions recorded</h3>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">Use the SDK test harness to generate your first session replay.</p>
      </div>
    );
  }

  function sessionHref(id: string): string {
    if (fromPath) return `/sessions/${id}?from=${encodeURIComponent(fromPath)}`;
    return `/sessions/${id}`;
  }

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="pl-6 pr-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Customer</th>
              <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Arrival</th>
              <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Duration</th>
              <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Engine / OS</th>
              <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Activity</th>
              <th className="pl-4 pr-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <tr key={s.id} className="group hover:bg-brand-50/30 transition-all duration-300">
                <td className="pl-6 pr-4 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-[14px] tracking-tight group-hover:text-brand-600 transition-colors">
                      {s.external_id ? truncate(s.external_id, 24) : 'Anonymous'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {truncate(s.anonymous_id, 14)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-slate-600 text-[13px] font-medium">
                      <LocalDate date={s.started_at} />
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-tighter">Local Time</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-slate-100 rounded-md text-slate-600 font-bold text-[12px]">
                    {formatMs(s.duration_ms)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-slate-500 group-hover:bg-brand-100/50 group-hover:text-brand-600 transition-all">
                      {getDeviceIcon(s.device_type)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-700 font-bold text-[13px] leading-tight">{s.os ?? 'Unknown'}</span>
                      <span className="text-slate-400 text-[11px] font-medium leading-tight">{s.browser ?? 'Web'}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-900 font-black text-base">{s.event_count}</span>
                    <div className="flex items-center gap-1.5">
                      {s.metadata?.rage_click && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-600 animate-pulse-subtle">
                          Rage
                        </span>
                      )}
                      {s.metadata?.tags && s.metadata.tags.length > 0 && (
                        <div className="flex -space-x-1">
                          {(s.metadata.tags as string[]).slice(0, 3).map((tagId) => {
                            const tag = TAG_OPTIONS.find((t) => t.id === tagId);
                            return tag ? (
                              <div
                                key={tagId}
                                className="w-3 h-3 rounded-full border-2 border-white ring-1 ring-slate-200"
                                style={{ backgroundColor: tag.color }}
                                title={tag.label}
                              />
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="pl-4 pr-6 py-4">
                  <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <BookmarkButton sessionId={s.id} bookmarked={s.is_bookmarked ?? false} />
                    <Link
                      href={sessionHref(s.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 brand-gradient text-white rounded-xl text-xs font-bold shadow-bloom transform transition-transform hover:scale-105"
                    >
                      <Play size={12} fill="currentColor" />
                      Play
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
