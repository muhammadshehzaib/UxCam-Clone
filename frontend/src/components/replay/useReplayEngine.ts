'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { SessionEvent } from '@/types';

export interface ReplayState {
  currentTimeMs: number;
  isPlaying: boolean;
  speed: number;
  activeEventIndex: number;
}

export interface ReplayControls {
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  setSpeed: (n: number) => void;
}

/** Binary search: find the largest index where events[i].elapsed_ms <= targetMs */
function findActiveIndex(events: SessionEvent[], targetMs: number): number {
  if (events.length === 0) return -1;
  let lo = 0;
  let hi = events.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].elapsed_ms <= targetMs) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return result;
}

export function useReplayEngine(
  events: SessionEvent[],
  durationMs: number
): ReplayState & ReplayControls {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [activeEventIndex, setActiveEventIndex] = useState(-1);

  // Refs to avoid stale closures in the RAF loop
  const rafRef = useRef<number | null>(null);
  const lastWallClockRef = useRef<number>(0);
  const currentTimeMsRef = useRef(0);
  const speedRef = useRef(1);
  const durationMsRef = useRef(durationMs);

  // Keep refs in sync
  useEffect(() => { currentTimeMsRef.current = currentTimeMs; }, [currentTimeMs]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { durationMsRef.current = durationMs; }, [durationMs]);

  const tick = useCallback(() => {
    const now = performance.now();
    const delta = now - lastWallClockRef.current;
    lastWallClockRef.current = now;

    const next = Math.min(
      currentTimeMsRef.current + delta * speedRef.current,
      durationMsRef.current
    );

    currentTimeMsRef.current = next;
    setCurrentTimeMs(next);
    setActiveEventIndex(findActiveIndex(events, next));

    if (next < durationMsRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setIsPlaying(false);
    }
  }, [events]);

  const play = useCallback(() => {
    if (currentTimeMsRef.current >= durationMsRef.current) {
      // Restart from beginning
      currentTimeMsRef.current = 0;
      setCurrentTimeMs(0);
      setActiveEventIndex(-1);
    }
    lastWallClockRef.current = performance.now();
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const seek = useCallback((ms: number) => {
    const clamped = Math.max(0, Math.min(ms, durationMsRef.current));
    currentTimeMsRef.current = clamped;
    setCurrentTimeMs(clamped);
    setActiveEventIndex(findActiveIndex(events, clamped));
    // If playing, reset the wall clock reference so drift doesn't accumulate
    if (rafRef.current) {
      lastWallClockRef.current = performance.now();
    }
  }, [events]);

  const setSpeed = useCallback((n: number) => {
    speedRef.current = n;
    setSpeedState(n);
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { currentTimeMs, isPlaying, speed, activeEventIndex, play, pause, seek, setSpeed };
}
