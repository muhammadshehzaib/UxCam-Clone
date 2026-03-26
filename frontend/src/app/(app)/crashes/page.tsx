'use client';

import { useState, useEffect } from 'react';
import { getCrashGroups, getCrashSessions } from '@/lib/api';
import { CrashGroup, CrashSession } from '@/types';
import CrashList from '@/components/crashes/CrashList';
import CrashSessionList from '@/components/crashes/CrashSessionList';
import { Bug } from 'lucide-react';

export default function CrashesPage() {
  const [crashes, setCrashes]           = useState<CrashGroup[]>([]);
  const [selected, setSelected]         = useState<CrashGroup | null>(null);
  const [sessions, setSessions]         = useState<CrashSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [days, setDays]                 = useState(30);
  const [apiError, setApiError]         = useState(false);

  useEffect(() => {
    getCrashGroups(days)
      .then((data) => { setCrashes(data); setApiError(false); setSelected(null); setSessions([]); })
      .catch(() => { setApiError(true); setCrashes([]); });
  }, [days]);

  useEffect(() => {
    if (!selected) { setSessions([]); return; }
    setSessionsLoading(true);
    getCrashSessions(selected.message, selected.filename, days)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [selected, days]);

  const totalSessions = crashes.reduce((s, c) => s + c.affected_sessions, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bug size={20} className="text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Crashes</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {crashes.length > 0
                ? `${crashes.length} unique errors · ${totalSessions} affected sessions`
                : 'Uncaught JS errors captured by the SDK'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                days === d ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* API error banner */}
      {apiError && (
        <div
          className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-600"
          data-testid="api-error-banner"
        >
          Could not load crash data. Check that the API is running.
        </div>
      )}

      {/* Crash list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <CrashList crashes={crashes} selected={selected} onSelect={setSelected} />
      </div>

      {/* Session list for selected crash */}
      {selected && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Sessions — <span className="font-mono text-red-600 normal-case">{selected.message.slice(0, 60)}</span>
            </p>
          </div>
          <div className="p-4">
            <CrashSessionList sessions={sessions} loading={sessionsLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
