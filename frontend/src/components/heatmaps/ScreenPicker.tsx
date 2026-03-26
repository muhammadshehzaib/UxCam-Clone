'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Monitor } from 'lucide-react';

interface ScreenPickerProps {
  screens: string[];
  selected: string;
}

export default function ScreenPicker({ screens, selected }: ScreenPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(screen: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('screen', screen);
    router.push(`/heatmaps?${params.toString()}`);
  }

  if (screens.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Monitor size={14} />
        No screens recorded yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Monitor size={14} className="text-slate-400 shrink-0" />
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {screens.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
