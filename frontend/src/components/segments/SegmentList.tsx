'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, PlaySquare, Users } from 'lucide-react';
import { deleteSegment } from '@/lib/api';
import { Segment, SegmentFilters } from '@/types';

interface SegmentListProps {
  segments: Segment[];
  onDeleted: () => void;
}

function filtersToParams(filters: SegmentFilters): string {
  const qs = new URLSearchParams();
  if (filters.device)      qs.set('device',      filters.device);
  if (filters.os)          qs.set('os',          filters.os);
  if (filters.browser)     qs.set('browser',     filters.browser);
  if (filters.minDuration) qs.set('minDuration', String(filters.minDuration));
  if (filters.rageClick)      qs.set('rageClick',   'true');
  if (filters.tags?.length)   qs.set('tags',         filters.tags.join(','));
  return qs.toString();
}

function FilterPills({ filters }: { filters: SegmentFilters }) {
  const pills: string[] = [];
  if (filters.device)      pills.push(`Device: ${filters.device}`);
  if (filters.os)          pills.push(`OS: ${filters.os}`);
  if (filters.browser)     pills.push(`Browser: ${filters.browser}`);
  if (filters.minDuration) pills.push(`Min: ${filters.minDuration}s`);
  if (filters.rageClick)      pills.push('Rage clicks');
  if (filters.tags?.length)   pills.push(`Tags: ${filters.tags.join(', ')}`);

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {pills.map((pill) => (
        <span
          key={pill}
          className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600"
          data-testid="filter-pill"
        >
          {pill}
        </span>
      ))}
    </div>
  );
}

export default function SegmentList({ segments, onDeleted }: SegmentListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteSegment(id);
      onDeleted();
    } catch {
      // silently ignore — user can retry
    } finally {
      setDeleting(null);
    }
  }

  if (segments.length === 0) {
    return (
      <div
        className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400"
        data-testid="segment-list-empty"
      >
        <p className="text-sm font-medium">No segments yet</p>
        <p className="text-xs mt-1">Create a segment below to save filter presets</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="segment-list">
      {segments.map((seg) => {
        const params  = filtersToParams(seg.filters);
        const isDeleting = deleting === seg.id;

        return (
          <div
            key={seg.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
            data-testid={`segment-item-${seg.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{seg.name}</p>
                <FilterPills filters={seg.filters} />
              </div>

              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <Link
                  href={`/sessions?${params}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                  data-testid={`apply-sessions-${seg.id}`}
                >
                  <PlaySquare size={12} />
                  Sessions
                </Link>
                <Link
                  href={`/users?${params}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  data-testid={`apply-users-${seg.id}`}
                >
                  <Users size={12} />
                  Users
                </Link>
                <button
                  onClick={() => handleDelete(seg.id)}
                  disabled={isDeleting}
                  className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                  aria-label={`Delete segment ${seg.name}`}
                  data-testid={`delete-segment-${seg.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
