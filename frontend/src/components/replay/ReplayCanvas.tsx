'use client';

import { useMemo } from 'react';
import { SessionEvent, NetworkFailure } from '@/types';
import { EVENT_COLORS } from '@/lib/utils';

interface ReplayCanvasProps {
  events:           SessionEvent[];
  activeEventIndex: number;
  currentTimeMs?:   number;
  networkFailures?: NetworkFailure[];
  screenWidth:      number | null;
  screenHeight:     number | null;
  showBackground?:  boolean;
  width?:           number;
}

const DEFAULT_WIDTH = 640;
// Network failure badge shows for 3 seconds after the failure timestamp
const NETWORK_BADGE_WINDOW_MS = 3000;

export default function ReplayCanvas({
  events,
  activeEventIndex,
  currentTimeMs = 0,
  networkFailures = [],
  screenWidth,
  screenHeight,
  showBackground = true,
  width = DEFAULT_WIDTH,
}: ReplayCanvasProps) {
  const aspectRatio  = screenWidth && screenHeight ? screenHeight / screenWidth : 16 / 9;
  const canvasHeight = Math.round(width * aspectRatio);

  const activeEvent = useMemo(
    () => (activeEventIndex >= 0 ? events[activeEventIndex] : null),
    [events, activeEventIndex]
  );

  // Click trail — last 5 click events before (and including) activeEventIndex
  const clickTrail = useMemo(() => {
    const clicks = events
      .slice(0, activeEventIndex + 1)
      .filter((e) => e.type === 'click' && e.x !== null && e.y !== null)
      .slice(-10);
    return clicks.map((e, i, arr) => ({
      ...e,
      opacity: arr.length > 1 ? 0.2 + (0.6 * (i / (arr.length - 1))) : 0.8,
    }));
  }, [events, activeEventIndex]);

  // Network failure badge — show the most recent failure within the window
  const activeNetworkFailure = useMemo(() => {
    return networkFailures.find(
      (f) => f.elapsed_ms <= currentTimeMs && f.elapsed_ms >= currentTimeMs - NETWORK_BADGE_WINDOW_MS
    ) ?? null;
  }, [networkFailures, currentTimeMs]);

  // Input persistence — show the last input for 2 seconds
  const activeInputEvent = useMemo(() => {
    const lastInput = events
      .slice(0, activeEventIndex + 1)
      .reverse()
      .find(e => e.type === 'input');
    
    if (lastInput && currentTimeMs - lastInput.elapsed_ms < 2000) {
      return lastInput;
    }
    return null;
  }, [events, activeEventIndex, currentTimeMs]);

  const tapX = activeEvent?.x != null ? activeEvent.x * width : null;
  const tapY = activeEvent?.y != null ? activeEvent.y * canvasHeight : null;
  const isPointerEvent = activeEvent?.type === 'click';
  const isScrollEvent  = activeEvent?.type === 'scroll';
  const isInputEvent   = !!activeInputEvent;
  const eventColor     = activeEvent ? (EVENT_COLORS[activeEvent.type] ?? '#6366f1') : '#6366f1';

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border-4 border-slate-700 shadow-xl ${
        showBackground ? 'bg-slate-800' : 'bg-transparent'
      }`}
      style={{ width: width, height: canvasHeight }}
      data-testid="replay-canvas"
    >
      {/* Device screen background */}
      {showBackground && <div className="absolute inset-0 bg-white" />}

      {/* Current screen name overlay */}
      {activeEvent?.screen_name && (
        <div className="absolute top-2 left-0 right-0 flex justify-center z-10">
          <span className="bg-slate-900/70 text-white text-xs px-2 py-0.5 rounded-full">
            {activeEvent.screen_name}
          </span>
        </div>
      )}

      {/* Click trail — fading dots of recent clicks */}
      {clickTrail.slice(0, -1).map((click: any, i: number) => (
        click.x != null && click.y != null ? (
          <div
            key={`trail-${click.id}-${i}`}
            data-testid="click-trail-dot"
            className="absolute pointer-events-none rounded-full border-2 border-white"
            style={{
              left:            click.x * width,
              top:             click.y * canvasHeight,
              transform:       'translate(-50%, -50%)',
              width:           10,
              height:          10,
              backgroundColor: EVENT_COLORS.click,
              opacity:         click.opacity,
            }}
          />
        ) : null
      ))}

      {/* Tap indicator for active click/input */}
      {isPointerEvent && tapX != null && tapY != null && (
        <div
          className="absolute pointer-events-none"
          style={{ left: tapX, top: tapY, transform: 'translate(-50%, -50%)' }}
        >
          <div
            className="absolute rounded-full animate-ping"
            style={{ width: 36, height: 36, top: -18, left: -18, backgroundColor: eventColor, opacity: 0.3 }}
          />
          <div
            className="rounded-full"
            style={{ width: 16, height: 16, backgroundColor: eventColor, opacity: 0.85, transform: 'translate(-50%, -50%)', position: 'relative' }}
          />
        </div>
      )}

      {/* Keyboard input indicator */}
      {isInputEvent && activeInputEvent?.target && (
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none z-20">
          <div className="bg-slate-900/80 text-white text-xs px-2 py-1 rounded-lg shadow-lg border border-white/20 animate-in fade-in slide-in-from-bottom-1 duration-300" data-testid="input-indicator">
            <span className="opacity-70 mr-1">⌨</span>
            <span className="font-semibold">{activeInputEvent.target}</span>: 
            <span className="text-amber-400 ml-1 font-mono">{activeInputEvent.value || ''}</span>
          </div>
        </div>
      )}

      {/* Scroll indicator */}
      {isScrollEvent && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-1.5 rounded-full opacity-70" style={{ height: 48, backgroundColor: EVENT_COLORS.scroll }} />
          <div className="text-xs text-slate-500 mt-1 text-center" style={{ fontSize: 10 }}>
            ↕ {activeEvent?.value ?? ''}
          </div>
        </div>
      )}

      {/* Network failure badge */}
      {activeNetworkFailure && (
        <div
          className="absolute top-2 right-2 z-30 pointer-events-none"
          data-testid="network-failure-badge"
        >
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-mono">
            {activeNetworkFailure.method} → {activeNetworkFailure.status || 'ERR'}
          </span>
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
