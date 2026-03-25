'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

const DEVICES = ['mobile', 'tablet', 'desktop'];
const OS_OPTIONS = ['macOS', 'Windows', 'iOS', 'Android', 'Linux'];

export default function SessionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = {
    dateFrom:    searchParams.get('dateFrom') ?? '',
    dateTo:      searchParams.get('dateTo') ?? '',
    device:      searchParams.get('device') ?? '',
    os:          searchParams.get('os') ?? '',
    minDuration: searchParams.get('minDuration') ?? '',
  };

  const hasFilters = Object.values(current).some(Boolean);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">

        {/* Date From */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">From</label>
          <input
            type="date"
            value={current.dateFrom}
            onChange={(e) => update('dateFrom', e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">To</label>
          <input
            type="date"
            value={current.dateTo}
            onChange={(e) => update('dateTo', e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Device */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">Device</label>
          <select
            value={current.device}
            onChange={(e) => update('device', e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">All devices</option>
            {DEVICES.map((d) => (
              <option key={d} value={d} className="capitalize">{d}</option>
            ))}
          </select>
        </div>

        {/* OS */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">OS</label>
          <select
            value={current.os}
            onChange={(e) => update('os', e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">All OS</option>
            {OS_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Min Duration */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">Min Duration (s)</label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 30"
            value={current.minDuration}
            onChange={(e) => update('minDuration', e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 w-28"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
          {current.dateFrom && (
            <FilterBadge label={`From: ${current.dateFrom}`} onRemove={() => update('dateFrom', '')} />
          )}
          {current.dateTo && (
            <FilterBadge label={`To: ${current.dateTo}`} onRemove={() => update('dateTo', '')} />
          )}
          {current.device && (
            <FilterBadge label={`Device: ${current.device}`} onRemove={() => update('device', '')} />
          )}
          {current.os && (
            <FilterBadge label={`OS: ${current.os}`} onRemove={() => update('os', '')} />
          )}
          {current.minDuration && (
            <FilterBadge label={`Min: ${current.minDuration}s`} onRemove={() => update('minDuration', '')} />
          )}
        </div>
      )}
    </div>
  );
}

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-brand-900 ml-0.5">
        <X size={10} />
      </button>
    </span>
  );
}
