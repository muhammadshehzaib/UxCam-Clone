'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSegments } from '@/lib/api';
import { Segment, SegmentFilters } from '@/types';
import SegmentList from '@/components/segments/SegmentList';
import SegmentBuilder from '@/components/segments/SegmentBuilder';
import { Sliders } from 'lucide-react';

export default function SegmentsPage() {
  const searchParams = useSearchParams();
  const [segments, setSegments] = useState<Segment[]>([]);

  const load = useCallback(() => {
    getSegments().then(setSegments).catch(() => setSegments([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build initialFilters from URL params (set by SegmentPicker's "Save current filters")
  const initialFilters: SegmentFilters = {};
  const device      = searchParams.get('device');
  const os          = searchParams.get('os');
  const browser     = searchParams.get('browser');
  const minDuration = searchParams.get('minDuration');
  const rageClick   = searchParams.get('rageClick');
  if (device)      initialFilters.device      = device;
  if (os)          initialFilters.os          = os;
  if (browser)     initialFilters.browser     = browser;
  if (minDuration) initialFilters.minDuration = parseInt(minDuration, 10);
  if (rageClick === 'true') initialFilters.rageClick = true;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Sliders size={20} className="text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Segments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Save filter presets and apply them across sessions and users
          </p>
        </div>
      </div>

      {/* Saved segments */}
      <div className="mb-6">
        <SegmentList segments={segments} onDeleted={load} />
      </div>

      {/* Builder — prefilled when arriving from "Save current filters" */}
      <SegmentBuilder onCreated={load} initialFilters={initialFilters} />
    </div>
  );
}
