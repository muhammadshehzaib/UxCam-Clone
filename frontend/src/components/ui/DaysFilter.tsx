'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DaysFilterProps {
  days:        number;
  basePath:    string;   // e.g. '/funnels/abc' or '/retention'
  presets?:    number[];
}

const DEFAULT_PRESETS = [7, 30, 90];

export default function DaysFilter({ days, basePath, presets = DEFAULT_PRESETS }: DaysFilterProps) {
  const router = useRouter();
  const [showCustom, setShowCustom] = useState(false);
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  function applyCustom() {
    if (!dateFrom || !dateTo) return;
    const from   = new Date(dateFrom);
    const to     = new Date(dateTo);
    const diffMs = to.getTime() - from.getTime();
    if (diffMs <= 0) return;
    const customDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    router.push(`${basePath}?days=${customDays}`);
    setShowCustom(false);
  }

  const canApply = dateFrom && dateTo && new Date(dateTo) > new Date(dateFrom);

  return (
    <div className="flex items-center gap-1 flex-wrap" data-testid="days-filter">
      {presets.map((d) => (
        <Link
          key={d}
          href={`${basePath}?days=${d}`}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
            days === d && !showCustom
              ? 'bg-brand-600 text-white'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
          data-testid={`days-preset-${d}`}
          onClick={() => setShowCustom(false)}
        >
          {d}d
        </Link>
      ))}
      <button
        onClick={() => setShowCustom((v) => !v)}
        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
          showCustom ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'
        }`}
        data-testid="days-custom-button"
      >
        Custom
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 mt-1 w-full sm:w-auto" data-testid="custom-date-inputs">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
            data-testid="custom-date-from"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
            data-testid="custom-date-to"
          />
          <button
            onClick={applyCustom}
            disabled={!canApply}
            className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
            data-testid="custom-date-apply"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
