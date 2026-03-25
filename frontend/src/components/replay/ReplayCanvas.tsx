'use client';

import { useMemo } from 'react';
import { SessionEvent } from '@/types';
import { EVENT_COLORS } from '@/lib/utils';

interface ReplayCanvasProps {
  events: SessionEvent[];
  activeEventIndex: number;
  screenWidth: number | null;
  screenHeight: number | null;
}

const CANVAS_WIDTH = 320;

export default function ReplayCanvas({
  events,
  activeEventIndex,
  screenWidth,
  screenHeight,
}: ReplayCanvasProps) {
  const aspectRatio = screenWidth && screenHeight ? screenHeight / screenWidth : 16 / 9;
  const canvasHeight = Math.round(CANVAS_WIDTH * aspectRatio);

  const activeEvent = useMemo(
    () => (activeEventIndex >= 0 ? events[activeEventIndex] : null),
    [events, activeEventIndex]
  );

  const tapX = activeEvent?.x != null ? activeEvent.x * CANVAS_WIDTH : null;
  const tapY = activeEvent?.y != null ? activeEvent.y * canvasHeight : null;
  const isPointerEvent = activeEvent?.type === 'click' || activeEvent?.type === 'input';
  const isScrollEvent = activeEvent?.type === 'scroll';
  const eventColor = activeEvent ? (EVENT_COLORS[activeEvent.type] ?? '#6366f1') : '#6366f1';

  return (
    <div
      className="relative bg-slate-800 rounded-2xl overflow-hidden border-4 border-slate-700 shadow-xl"
      style={{ width: CANVAS_WIDTH, height: canvasHeight }}
    >
      {/* Device screen background */}
      <div className="absolute inset-0 bg-white" />

      {/* Current screen name overlay */}
      {activeEvent?.screen_name && (
        <div className="absolute top-2 left-0 right-0 flex justify-center z-10">
          <span className="bg-slate-900/70 text-white text-xs px-2 py-0.5 rounded-full">
            {activeEvent.screen_name}
          </span>
        </div>
      )}

      {/* Tap indicator */}
      {isPointerEvent && tapX != null && tapY != null && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: tapX,
            top: tapY,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Outer ripple */}
          <div
            className="absolute rounded-full animate-ping"
            style={{
              width: 36,
              height: 36,
              top: -18,
              left: -18,
              backgroundColor: eventColor,
              opacity: 0.3,
            }}
          />
          {/* Inner dot */}
          <div
            className="rounded-full"
            style={{
              width: 16,
              height: 16,
              backgroundColor: eventColor,
              opacity: 0.85,
              transform: 'translate(-50%, -50%)',
              position: 'relative',
            }}
          />
        </div>
      )}

      {/* Scroll indicator */}
      {isScrollEvent && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="w-1.5 rounded-full opacity-70"
            style={{
              height: 48,
              backgroundColor: EVENT_COLORS.scroll,
            }}
          />
          <div
            className="text-xs text-slate-500 mt-1 text-center"
            style={{ fontSize: 10 }}
          >
            ↕ {activeEvent?.value ?? ''}
          </div>
        </div>
      )}

      {/* Empty state */}
      {activeEventIndex < 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Press play to start</p>
        </div>
      )}
    </div>
  );
}
