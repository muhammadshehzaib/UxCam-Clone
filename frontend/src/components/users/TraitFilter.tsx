'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { getUserTraitKeys } from '@/lib/api';

export default function TraitFilter() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [traitKeys, setTraitKeys] = useState<string[]>([]);

  // Read current filters from URL: traitKey=plan&traitVal=pro&traitKey=country&traitVal=US
  const rawKeys = searchParams.getAll('traitKey');
  const rawVals = searchParams.getAll('traitVal');
  const filters = rawKeys.map((k, i) => ({ key: k, value: rawVals[i] ?? '' })).filter((f) => f.key);

  useEffect(() => {
    getUserTraitKeys().then(setTraitKeys).catch(() => setTraitKeys([]));
  }, []);

  function apply(newFilters: { key: string; value: string }[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('traitKey');
    params.delete('traitVal');
    params.delete('page');
    for (const { key, value } of newFilters.filter((f) => f.key && f.value)) {
      params.append('traitKey', key);
      params.append('traitVal', value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function addFilter() {
    apply([...filters, { key: '', value: '' }]);
  }

  function removeFilter(index: number) {
    apply(filters.filter((_, i) => i !== index));
  }

  function updateFilter(index: number, field: 'key' | 'value', val: string) {
    const updated = filters.map((f, i) => i === index ? { ...f, [field]: val } : f);
    // Only push URL if both key and value are set
    if (updated[index].key && updated[index].value) {
      apply(updated);
    }
  }

  if (filters.length === 0) {
    return (
      <button
        onClick={addFilter}
        className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 transition-colors"
        data-testid="add-trait-filter"
      >
        <Plus size={12} />
        Add trait filter
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {filters.map((f, i) => (
        <div key={i} className="flex items-center gap-2" data-testid={`trait-filter-row-${i}`}>
          <select
            value={f.key}
            onChange={(e) => updateFilter(i, 'key', e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            data-testid={`trait-key-select-${i}`}
          >
            <option value="">Select trait…</option>
            {traitKeys.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <span className="text-xs text-slate-400">=</span>
          <input
            type="text"
            value={f.value}
            onChange={(e) => updateFilter(i, 'value', e.target.value)}
            placeholder="value"
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-28 focus:outline-none focus:ring-2 focus:ring-brand-500"
            data-testid={`trait-val-input-${i}`}
          />
          <button
            onClick={() => removeFilter(i)}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            data-testid={`remove-trait-${i}`}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      {filters.length < 3 && (
        <button
          onClick={addFilter}
          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 transition-colors"
          data-testid="add-trait-filter"
        >
          <Plus size={11} />
          Add filter
        </button>
      )}
    </div>
  );
}
