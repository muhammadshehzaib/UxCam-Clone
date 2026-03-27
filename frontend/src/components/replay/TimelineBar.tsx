'use client';

import { useRef } from 'react';
import { SessionEvent, NetworkFailure } from '@/types';
import { EVENT_COLORS } from '@/lib/utils';

interface TimelineBarProps {
  events:            SessionEvent[];
  durationMs:        number;
  currentTimeMs:     number;
  onSeek:            (ms: number) => void;
  rageTimestamps?:   number[];
  freezeTimestamps?: number[];
  networkFailures?:  NetworkFailure[];
}

export default function TimelineBar({
  events,
  durationMs,
  currentTimeMs,
  onSeek,
  rageTimestamps   = [],
  freezeTimestamps = [],
  networkFailures  = [],
}: TimelineBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  function getTimeFromPointer(clientX: number): number {
    if (!barRef.current || durationMs === 0) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return fraction * durationMs;
  }

  function handleClick(e: React.MouseEvent) {
    onSeek(getTimeFromPointer(e.clientX));
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (e.buttons !== 1) return;
    onSeek(getTimeFromPointer(e.clientX));
  }

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

  // Only show up to 200 event dots for performance
  const visibleEvents = events.slice(0, 200);

  return (
    <div
      ref={barRef}
      className="relative h-8 cursor-pointer select-none flex items-center"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    >
      {/* Track */}
      <div className="absolute inset-x-0 h-1.5 bg-slate-200 rounded-full">
        {/* Progress fill */}
        <div
          className="h-full bg-brand-500 rounded-full transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Event marker dots */}
      {visibleEvents.map((ev, i) => {
        const pct = durationMs > 0 ? (ev.elapsed_ms / durationMs) * 100 : 0;
        return (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2"
            style={{
              left:            `${pct}%`,
              backgroundColor: EVENT_COLORS[ev.type] ?? '#94a3b8',
              top:             '50%',
              marginTop:       -3,
            }}
            title={`${ev.type} at ${(ev.elapsed_ms / 1000).toFixed(1)}s${ev.screen_name ? ` · ${ev.screen_name}` : ''}`}
          />
        );
      })}

      {/* Freeze markers — orange bars above the track */}
      {freezeTimestamps.map((ms, i) => {
        const pct = durationMs > 0 ? (ms / durationMs) * 100 : 0;
        return (
          <div
            key={`freeze-${i}`}
            data-testid="freeze-marker"
            className="absolute -translate-x-1/2 z-20"
            style={{ left: `${pct}%`, top: '50%', marginTop: -8 }}
            title={`UI freeze at ${(ms / 1000).toFixed(1)}s`}
          >
            <div
              className="w-1.5 h-4 rounded-sm"
              style={{ backgroundColor: EVENT_COLORS.freeze }}
            />
          </div>
        );
      })}

      {/* Network failure markers — red circles below the track */}
      {networkFailures.map((f, i) => {
        const pct = durationMs > 0 ? (f.elapsed_ms / durationMs) * 100 : 0;
        return (
          <div
            key={`net-${i}`}
            data-testid="network-marker"
            className="absolute -translate-x-1/2 z-20"
            style={{ left: `${pct}%`, top: '50%', marginTop: 4 }}
            title={`${f.method} ${f.url} → ${f.status || 'ERR'} (${f.duration_ms}ms) at ${(f.elapsed_ms / 1000).toFixed(1)}s`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: EVENT_COLORS.network }}
            />
          </div>
        );
      })}

      {/* Rage click markers — red diamonds above the track */}
      {rageTimestamps.map((ms, i) => {
        const pct = durationMs > 0 ? (ms / durationMs) * 100 : 0;
        return (
          <div
            key={`rage-${i}`}
            data-testid="rage-marker"
            className="absolute -translate-x-1/2 z-20"
            style={{ left: `${pct}%`, top: '50%', marginTop: -10 }}
            title={`Rage click at ${(ms / 1000).toFixed(1)}s`}
          >
            <div
              className="w-3 h-3 rotate-45"
              style={{ backgroundColor: EVENT_COLORS.rage_click }}
            />
          </div>
        );
      })}

      {/* Scrubber thumb */}
      <div
        className="absolute w-4 h-4 bg-white border-2 border-brand-500 rounded-full shadow-md -translate-x-1/2 z-10"
        style={{ left: `${progress}%`, top: '50%', marginTop: -8 }}
      />
    </div>
  );
}
