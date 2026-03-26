'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { createFunnel } from '@/lib/api';

interface FunnelBuilderProps {
  screenNames: string[];
}

export default function FunnelBuilder({ screenNames }: FunnelBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [steps, setSteps] = useState([{ screen: '' }, { screen: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStep() {
    if (steps.length >= 10) return;
    setSteps((prev) => [...prev, { screen: '' }]);
  }

  function removeStep(index: number) {
    if (steps.length <= 2) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, screen: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { screen } : s)));
  }

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError('Please enter a funnel name');
      return;
    }
    if (steps.some((s) => !s.screen.trim())) {
      setError('All steps must have a screen name');
      return;
    }

    setSaving(true);
    try {
      const funnel = await createFunnel(name.trim(), steps);
      router.push(`/funnels/${funnel.id}`);
    } catch {
      setError('Failed to save funnel. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch size={16} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-slate-700">New Funnel</h2>
      </div>

      {/* Name */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          Funnel Name
        </label>
        <input
          type="text"
          placeholder="e.g. Sign-up Flow"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 placeholder-slate-400"
          data-testid="funnel-name-input"
        />
      </div>

      {/* Steps */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-500 mb-2">
          Steps (in order)
        </label>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              {screenNames.length > 0 ? (
                <select
                  value={step.screen}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 bg-white"
                  data-testid={`step-input-${i}`}
                >
                  <option value="">Select a screen…</option>
                  {screenNames.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. /checkout"
                  value={step.screen}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 placeholder-slate-400"
                  data-testid={`step-input-${i}`}
                />
              )}
              <button
                onClick={() => removeStep(i)}
                disabled={steps.length <= 2}
                className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label={`Remove step ${i + 1}`}
                data-testid={`remove-step-${i}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add step */}
      {steps.length < 10 && (
        <button
          onClick={addStep}
          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mb-5 transition-colors"
          data-testid="add-step-button"
        >
          <Plus size={13} />
          Add Step
        </button>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 mb-3" data-testid="builder-error">{error}</p>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 px-4 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        data-testid="save-funnel-button"
      >
        {saving ? 'Saving…' : 'Save Funnel'}
      </button>
    </div>
  );
}
