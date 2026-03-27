'use client';

import { useState, useEffect, Suspense } from 'react';
import { getHeatmap } from '@/lib/api';
import { HeatmapPoint } from '@/types';
import HeatmapCanvas from './HeatmapCanvas';
import ScreenPicker from './ScreenPicker';

// Device frame dimensions (portrait mobile)
const FRAME_WIDTH = 390;
const FRAME_HEIGHT = 720;

const DEVICE_OPTIONS = [
  { value: '',         label: 'All' },
  { value: 'mobile',   label: 'Mobile' },
  { value: 'tablet',   label: 'Tablet' },
  { value: 'desktop',  label: 'Desktop' },
];

interface HeatmapViewerProps {
  screens:       string[];
  initialScreen: string;
  initialDevice?: string;
}

export default function HeatmapViewer({ screens, initialScreen, initialDevice = '' }: HeatmapViewerProps) {
  const [selected, setSelected] = useState(initialScreen);
  const [device,   setDevice]   = useState(initialDevice);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);

  useEffect(() => {
    if (!selected) return;

    setPoints([]);
    setTotalClicks(0);
    setLoading(true);
    getHeatmap(selected, 30, device || undefined)
      .then((data) => {
        setPoints(data);
        setTotalClicks(data.reduce((sum, p) => sum + p.count, 0));
      })
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [selected, device]);

  // Sync selected screen when initialScreen changes (URL navigation)
  useEffect(() => {
    setSelected(initialScreen);
  }, [initialScreen]);

  const maxCount = points.length > 0 ? Math.max(...points.map((p) => p.count)) : 0;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Heatmaps</h1>
          <p className="text-slate-500 text-sm mt-1">
            {totalClicks > 0
              ? `${totalClicks.toLocaleString()} clicks recorded on this screen`
              : 'Select a screen to view click distribution'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Device filter */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white">
            {DEVICE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDevice(opt.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  device === opt.value
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
                data-testid={`device-filter-${opt.value || 'all'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Suspense fallback={null}>
            <ScreenPicker
              screens={screens}
              selected={selected}
            />
          </Suspense>
        </div>
      </div>

      {screens.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-slate-400 bg-white rounded-xl border border-slate-200">
          <p className="text-base font-medium">No screen data yet</p>
          <p className="text-sm mt-1">Start recording sessions with the SDK to see heatmaps</p>
        </div>
      ) : (
        <div className="flex gap-8 items-start">
          {/* Heatmap canvas in a device frame */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative rounded-2xl border-4 border-slate-800 bg-slate-100 shadow-xl overflow-hidden"
              style={{ width: FRAME_WIDTH + 8, height: FRAME_HEIGHT + 8 }}
            >
              {loading ? (
                <div
                  className="flex items-center justify-center bg-slate-100 animate-pulse"
                  style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
                >
                  <span className="text-slate-400 text-sm">Loading...</span>
                </div>
              ) : (
                <HeatmapCanvas points={points} width={FRAME_WIDTH} height={FRAME_HEIGHT} />
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Low</span>
              <div
                className="h-2 w-40 rounded-full"
                style={{
                  background:
                    'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
                }}
              />
              <span>High</span>
            </div>
          </div>

          {/* Stats panel */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Click Areas</h2>
              {points.length === 0 ? (
                <p className="text-sm text-slate-400">No clicks recorded for this screen</p>
              ) : (
                <div className="space-y-2">
                  {points.slice(0, 10).map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">
                            ({Math.round(p.x * 100)}%, {Math.round(p.y * 100)}%)
                          </span>
                          <span className="font-medium text-slate-700">{p.count} clicks</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${(p.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
