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
import DOMReplayViewer from './DOMReplayViewer';
import TimelineBar from './TimelineBar';
import PlaybackControls from './PlaybackControls';
import SessionInfoPanel from './SessionInfoPanel';

interface DOMFrame { data: string; elapsed_ms: number; type: string; }

interface ReplayViewerClientProps {
  session:       Session;
  events:        SessionEvent[];
  initialSeekMs?: number;
  domFrames?:    DOMFrame[];   // populated when session has DOM recording
}

export default function ReplayViewerClient({ session, events, initialSeekMs, domFrames = [] }: ReplayViewerClientProps) {
  const hasDOMRecording = domFrames.length > 0;
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
    <div className="space-y-8 pb-12">
      {/* Main content: canvas + info panel */}
      <div className="flex flex-col lg:flex-row gap-8 items-start animate-slide-up">
        {/* Unified Replay Display: DOM Video + Interaction Overlay */}
        <div className="flex-shrink-0">
          <div 
            className="relative rounded-3xl border-8 border-surface-900 shadow-bloom-lg overflow-hidden bg-black ring-1 ring-white/10"
            style={{ 
              width: 1000, 
              height: session.screen_width && session.screen_height 
                ? (1000 * session.screen_height) / session.screen_width 
                : 600 
            }}
          >
            {hasDOMRecording && (
              <DOMReplayViewer
                frames={domFrames}
                currentTimeMs={currentTimeMs}
                width={1000}
                initialAspectRatio={session.screen_width && session.screen_height ? session.screen_height / session.screen_width : 16 / 9}
              />
            )}
            
            <div className={hasDOMRecording ? "absolute inset-0 z-10 pointer-events-none" : ""}>
              <ReplayCanvas
                events={events}
                activeEventIndex={activeEventIndex}
                currentTimeMs={currentTimeMs}
                networkFailures={networkFailures}
                screenWidth={session.screen_width}
                screenHeight={session.screen_height}
                showBackground={!hasDOMRecording}
                width={1000}
              />
            </div>
          </div>
        </div>

        {/* Info & Side Panel */}
        <div className="flex-1 w-full space-y-6">
          <div className="glass-card p-1 rounded-2xl">
            <SessionInfoPanel session={session} calculatedDurationMs={durationMs} />
          </div>

          {/* Event log — premium card style */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
              <div className="w-1 h-1 bg-brand-500 rounded-full" />
              Real-time Event Stream
            </h3>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              {events
                .slice(Math.max(0, activeEventIndex - 8), activeEventIndex + 1)
                .reverse()
                .map((ev, i) => (
                  <div
                    key={ev.id}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 border ${
                      i === 0 
                        ? 'bg-brand-500/10 border-brand-500/20 shadow-sm scale-[1.02]' 
                        : 'bg-white/40 border-transparent text-slate-500'
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ring-4 shadow-sm flex-shrink-0 transition-all ${i === 0 ? 'animate-pulse ring-brand-500/20' : 'ring-slate-100'}`}
                      style={{ backgroundColor: EVENT_COLORS[ev.type] ?? (i === 0 ? '#6366f1' : '#cbd5e1') }}
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold capitalize text-[13px] ${i === 0 ? 'text-brand-900' : 'text-slate-700'}`}>{ev.type}</span>
                        <span className="text-[10px] font-mono opacity-50">{(ev.elapsed_ms / 1000).toFixed(2)}s</span>
                      </div>
                      {ev.type === 'network' && ev.value && (
                        <span className="text-red-500 font-mono text-[11px] truncate">→ {ev.value}</span>
                      )}
                      {ev.screen_name && (
                        <span className="text-slate-400 text-[11px] truncate mt-0.5">{ev.screen_name}</span>
                      )}
                    </div>
                  </div>
                ))}
              {activeEventIndex < 0 && (
                <div className="text-center py-12">
                   <div className="w-10 h-10 brand-gradient rounded-full mx-auto mb-3 opacity-20" />
                   <p className="text-xs text-slate-400 font-medium tracking-tight">System initialized. Waiting for playback...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Controls Area */}
      <div className="glass-card p-8 rounded-[2rem] shadow-bloom">
        <div className="space-y-6">
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
    </div>
  );
}
  );
}
