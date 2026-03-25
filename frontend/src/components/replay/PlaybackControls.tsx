'use client';

import { Play, Pause, RotateCcw } from 'lucide-react';
import { formatMsShort } from '@/lib/utils';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ms: number) => void;
  onSetSpeed: (n: number) => void;
}

const SPEEDS = [0.5, 1, 2];

export default function PlaybackControls({
  isPlaying,
  currentTimeMs,
  durationMs,
  speed,
  onPlay,
  onPause,
  onSeek,
  onSetSpeed,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Play / Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="w-9 h-9 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-colors shadow-sm"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} />}
      </button>

      {/* Restart */}
      <button
        onClick={() => { onSeek(0); }}
        className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-500"
        aria-label="Restart"
      >
        <RotateCcw size={14} />
      </button>

      {/* Time display */}
      <span className="text-sm text-slate-600 tabular-nums min-w-[80px]">
        {formatMsShort(currentTimeMs)} / {formatMsShort(durationMs)}
      </span>

      {/* Speed selector */}
      <div className="flex items-center gap-1 ml-auto">
        <span className="text-xs text-slate-500 mr-1">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSetSpeed(s)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              speed === s
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
