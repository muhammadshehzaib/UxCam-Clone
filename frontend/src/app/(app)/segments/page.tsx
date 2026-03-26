'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSegments } from '@/lib/api';
import { Segment } from '@/types';
import SegmentList from '@/components/segments/SegmentList';
import SegmentBuilder from '@/components/segments/SegmentBuilder';
import { Sliders } from 'lucide-react';

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);

  const load = useCallback(() => {
    getSegments().then(setSegments).catch(() => setSegments([]));
  }, []);

  useEffect(() => { load(); }, [load]);

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

      {/* Builder */}
      <SegmentBuilder onCreated={load} />
    </div>
  );
}
