'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { BookmarkCheck, ChevronDown } from 'lucide-react';
import { getSegments } from '@/lib/api';
import { Segment, SegmentFilters } from '@/types';

function filtersToParams(filters: SegmentFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.device)      p.device      = filters.device;
  if (filters.os)          p.os          = filters.os;
  if (filters.browser)     p.browser     = filters.browser;
  if (filters.minDuration) p.minDuration = String(filters.minDuration);
  if (filters.rageClick)   p.rageClick   = 'true';
  return p;
}

export default function SegmentPicker() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [segments, setSegments] = useState<Segment[]>([]);
  const [open,     setOpen]     = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSegments().then(setSegments).catch(() => setSegments([]));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function applySegment(seg: Segment) {
    const params = new URLSearchParams();
    const filterParams = filtersToParams(seg.filters);
    Object.entries(filterParams).forEach(([k, v]) => params.set(k, v));
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  const hasActiveFilters = [
    'device', 'os', 'browser', 'minDuration', 'rageClick',
  ].some((k) => searchParams.has(k));

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 bg-white transition-colors"
        data-testid="segment-picker-trigger"
      >
        <BookmarkCheck size={14} className="text-brand-500" />
        Saved Segments
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden"
          data-testid="segment-picker-dropdown"
        >
          {segments.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400" data-testid="segment-picker-empty">
              No saved segments yet
            </div>
          ) : (
            <ul className="py-1">
              {segments.map((seg) => (
                <li key={seg.id}>
                  <button
                    onClick={() => applySegment(seg)}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    data-testid={`segment-picker-option-${seg.id}`}
                  >
                    {seg.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasActiveFilters && (
            <>
              <div className="border-t border-slate-100" />
              <button
                onClick={() => {
                  // Pass current filter params to /segments so builder can prefill
                  const prefill = new URLSearchParams();
                  ['device', 'os', 'browser', 'minDuration', 'rageClick'].forEach((k) => {
                    const v = searchParams.get(k);
                    if (v) prefill.set(k, v);
                  });
                  router.push(`/segments?${prefill.toString()}`);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-brand-600 hover:bg-brand-50 transition-colors"
                data-testid="save-current-filters-btn"
              >
                Save current filters…
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
