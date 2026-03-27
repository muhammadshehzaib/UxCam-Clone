'use client';

import { useEffect } from 'react';
import { Session, SessionEvent } from '@/types';
import { useReplayEngine } from './useReplayEngine';
import { detectRageClickTimestamps } from '@/lib/rageClickDetector';
import { detectFreezeTimestamps } from '@/lib/freezeDetector';
import { detectNetworkFailures } from '@/lib/networkDetector';
import { detectFeedbackEvents } from '@/lib/feedbackDetector';
import { EVENT_COLORS } from '@/lib/utils';
import ReplayCanvas from './ReplayCanvas';
import TimelineBar from './TimelineBar';
import PlaybackControls from './PlaybackControls';
import SessionInfoPanel from './SessionInfoPanel';

interface ReplayViewerClientProps {
  session: Session;
  events: SessionEvent[];
  initialSeekMs?: number;
}

export default function ReplayViewerClient({ session, events, initialSeekMs }: ReplayViewerClientProps) {
  const durationMs = session.duration_ms ?? (events.length > 0 ? events[events.length - 1].elapsed_ms + 100 : 0);

  const { currentTimeMs, isPlaying, speed, activeEventIndex, play, pause, seek, setSpeed } =
    useReplayEngine(events, durationMs);

  const rageTimestamps   = detectRageClickTimestamps(events);
  const freezeTimestamps = detectFreezeTimestamps(events);
  const networkFailures  = detectNetworkFailures(events);
  const feedbackEvents   = detectFeedbackEvents(events);

  // Jump to crash / deep-link position on first render
  useEffect(() => {
    if (initialSeekMs !== undefined && initialSeekMs > 0) {
      seek(initialSeekMs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-400">No events recorded for this session.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main content: canvas + info panel */}
      <div className="flex gap-6 items-start">
        {/* Canvas */}
        <div className="flex-shrink-0">
          <ReplayCanvas
            events={events}
            activeEventIndex={activeEventIndex}
            currentTimeMs={currentTimeMs}
            networkFailures={networkFailures}
            screenWidth={session.screen_width}
            screenHeight={session.screen_height}
          />
        </div>

        {/* Info panel */}
        <div className="flex-1 min-w-0">
          <SessionInfoPanel session={session} />

          {/* Event log — shows last few events */}
          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Recent Events
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {events
                .slice(Math.max(0, activeEventIndex - 4), activeEventIndex + 1)
                .reverse()
                .map((ev, i) => (
                  <div
                    key={ev.id}
                    className={`flex items-center gap-2 text-xs px-2 py-1 rounded transition-colors ${
                      i === 0 ? 'bg-brand-50 text-brand-700' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: EVENT_COLORS[ev.type] ?? (i === 0 ? '#6366f1' : '#cbd5e1') }}
                    />
                    <span className="font-mono">{(ev.elapsed_ms / 1000).toFixed(1)}s</span>
                    <span className="font-medium capitalize">{ev.type}</span>
                    {ev.type === 'network' && ev.value && (
                      <span className="text-red-500 font-mono text-xs">→ {ev.value}</span>
                    )}
                    {ev.screen_name && (
                      <span className="text-slate-400 truncate">{ev.screen_name}</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline + controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <TimelineBar
          events={events}
          durationMs={durationMs}
          currentTimeMs={currentTimeMs}
          onSeek={seek}
          rageTimestamps={rageTimestamps}
          freezeTimestamps={freezeTimestamps}
          networkFailures={networkFailures}
          feedbackEvents={feedbackEvents}
        />
        <PlaybackControls
          isPlaying={isPlaying}
          currentTimeMs={currentTimeMs}
          durationMs={durationMs}
          speed={speed}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          onSetSpeed={setSpeed}
        />
      </div>
    </div>
  );
}
