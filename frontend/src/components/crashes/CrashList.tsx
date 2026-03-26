'use client';

import { CrashGroup } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Bug } from 'lucide-react';

interface CrashListProps {
  crashes: CrashGroup[];
  selected: CrashGroup | null;
  onSelect: (crash: CrashGroup) => void;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default function CrashList({ crashes, selected, onSelect }: CrashListProps) {
  if (crashes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400" data-testid="crash-list-empty">
        <Bug size={28} className="mb-2 opacity-40" />
        <p className="text-sm font-medium">No crashes recorded</p>
        <p className="text-xs mt-1">Errors captured by the SDK will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden" data-testid="crash-list">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Error</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">File</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Occur.</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Sessions</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last seen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {crashes.map((crash, i) => {
            const isActive = selected?.message === crash.message && selected?.filename === crash.filename;
            return (
              <tr
                key={i}
                onClick={() => onSelect(crash)}
                className={`cursor-pointer transition-colors ${
                  isActive ? 'bg-red-50' : 'hover:bg-slate-50'
                }`}
                data-testid={`crash-row-${i}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className={`font-mono text-xs ${isActive ? 'text-red-700 font-semibold' : 'text-slate-700'}`}>
                      {truncate(crash.message, 80)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                  {crash.filename}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 text-right font-medium">
                  {crash.total_occurrences.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    {crash.affected_sessions}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {formatDistanceToNow(new Date(crash.last_seen), { addSuffix: true })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
