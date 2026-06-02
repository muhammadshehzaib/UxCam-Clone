'use client';

import { useMemo } from 'react';

export interface ScreenFrame {
  data:       string;   // base64 JPEG or full data URI
  elapsed_ms: number;
  width?:     number;
  height?:    number;
}

interface ScreenReplayViewerProps {
  frames:        ScreenFrame[];
  currentTimeMs: number;
}

/** Normalize a stored frame to a usable <img> src. */
function toSrc(data: string): string {
  return data.startsWith('data:') ? data : `data:image/jpeg;base64,${data}`;
}

/**
 * Mobile session replay: shows the most recent screenshot at or before the
 * current playback time. The interaction overlay (touch markers) is rendered
 * separately on top by ReplayViewerClient, mirroring the DOM-replay layering.
 */
export default function ScreenReplayViewer({ frames, currentTimeMs }: ScreenReplayViewerProps) {
  const activeFrame = useMemo(() => {
    let current: ScreenFrame | null = null;
    for (const f of frames) {
      if (f.elapsed_ms <= currentTimeMs) current = f;
      else break; // frames are ordered by elapsed_ms
    }
    // Before the first frame's timestamp, fall back to the earliest frame.
    return current ?? frames[0] ?? null;
  }, [frames, currentTimeMs]);

  if (!frames.length) {
    return (
      <div
        className="flex items-center justify-center w-full h-full bg-slate-100"
        data-testid="screen-replay-empty"
      >
        <p className="text-slate-400 text-sm text-center px-4">
          No screen recording available for this session
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black" data-testid="screen-replay-viewer">
      {activeFrame && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={toSrc(activeFrame.data)}
          alt="Session screen"
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
          data-testid="screen-replay-image"
        />
      )}
    </div>
  );
}
