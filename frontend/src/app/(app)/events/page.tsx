'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCustomEvents, getCustomEventTimeline } from '@/lib/api';
import CustomEventsList from '@/components/events/CustomEventsList';
import CustomEventChart from '@/components/events/CustomEventChart';
import DaysFilter from '@/components/ui/DaysFilter';
import { Activity } from 'lucide-react';

export default function EventsPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '30') || 30));

  const [eventsData,  setEventsData]  = useState<{ events: Array<{ name: string; count: number }>; total_events: number; unique_names: number } | null>(null);
  const [selected,    setSelected]    = useState<string | null>(null);
  const [timeline,    setTimeline]    = useState<Array<{ date: string; count: number }>>([]);
  const [loadingLine, setLoadingLine] = useState(false);

  useEffect(() => {
    getCustomEvents(days)
      .then((data) => { setEventsData(data); setSelected(null); setTimeline([]); })
      .catch(() => setEventsData(null));
  }, [days]);

  useEffect(() => {
    if (!selected) { setTimeline([]); return; }
    setLoadingLine(true);
    getCustomEventTimeline(selected, days)
      .then(setTimeline)
      .catch(() => setTimeline([]))
      .finally(() => setLoadingLine(false));
  }, [selected, days]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-brand-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Custom Events</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {eventsData
                ? `${eventsData.total_events.toLocaleString()} events · ${eventsData.unique_names} unique names`
                : 'Tracked via UXClone.track()'}
            </p>
          </div>
        </div>
        <DaysFilter days={days} basePath="/events" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Top Events</h2>
          </div>
          <CustomEventsList
            events={eventsData?.events ?? []}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            {selected ? `Trend: ${selected}` : 'Select an event to see its trend'}
          </h2>
          {selected && !loadingLine && <CustomEventChart eventName={selected} data={timeline} />}
          {loadingLine && <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />}
          {!selected && (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Click an event on the left
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
