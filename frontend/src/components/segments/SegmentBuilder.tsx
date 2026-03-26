'use client';

import { useState } from 'react';
import { createSegment } from '@/lib/api';
import { SegmentFilters } from '@/types';
import { Sliders } from 'lucide-react';

const DEVICES  = ['mobile', 'tablet', 'desktop'];
const OS_LIST  = ['iOS', 'Android', 'macOS', 'Windows', 'Linux'];
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge'];

interface SegmentBuilderProps {
  onCreated: () => void;
}

export default function SegmentBuilder({ onCreated }: SegmentBuilderProps) {
  const [name,        setName]        = useState('');
  const [device,      setDevice]      = useState('');
  const [os,          setOs]          = useState('');
  const [browser,     setBrowser]     = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [rageClick,   setRageClick]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  function buildFilters(): SegmentFilters {
    const f: SegmentFilters = {};
    if (device)            f.device      = device;
    if (os)                f.os          = os;
    if (browser)           f.browser     = browser;
    if (minDuration)       f.minDuration = parseInt(minDuration, 10);
    if (rageClick)         f.rageClick   = true;
    return f;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Segment name is required'); return; }
    const filters = buildFilters();
    if (Object.keys(filters).length === 0) { setError('Select at least one filter'); return; }

    setSaving(true);
    try {
      await createSegment(name.trim(), filters);
      // Reset form
      setName(''); setDevice(''); setOs(''); setBrowser(''); setMinDuration(''); setRageClick(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save segment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <Sliders size={15} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-slate-700">New Segment</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Segment Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mobile iOS rage-tappers"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            data-testid="segment-name-input"
          />
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Device */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Device</label>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              data-testid="segment-device-select"
            >
              <option value="">Any</option>
              {DEVICES.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
            </select>
          </div>

          {/* OS */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">OS</label>
            <select
              value={os}
              onChange={(e) => setOs(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              data-testid="segment-os-select"
            >
              <option value="">Any</option>
              {OS_LIST.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Browser */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Browser</label>
            <select
              value={browser}
              onChange={(e) => setBrowser(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              data-testid="segment-browser-select"
            >
              <option value="">Any</option>
              {BROWSERS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Min Duration */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Min Duration (s)</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 60"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              data-testid="segment-duration-input"
            />
          </div>

          {/* Rage click */}
          <div className="flex items-center gap-2 pt-5">
            <input
              id="rageClick"
              type="checkbox"
              checked={rageClick}
              onChange={(e) => setRageClick(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              data-testid="segment-rage-click-checkbox"
            />
            <label htmlFor="rageClick" className="text-sm text-slate-600">Rage clicks only</label>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600" data-testid="segment-builder-error">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          data-testid="segment-save-button"
        >
          {saving ? 'Saving…' : 'Save Segment'}
        </button>
      </form>
    </div>
  );
}
