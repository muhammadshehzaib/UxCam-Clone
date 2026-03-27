'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadCsv } from '@/lib/api';

interface ExportButtonProps {
  path:     string;   // e.g. '/sessions/export.csv?device=mobile'
  filename: string;   // e.g. 'sessions.csv'
}

export default function ExportButton({ path, filename }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      await downloadCsv(path, filename);
    } catch {
      setError('Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors bg-white"
        data-testid="export-button"
      >
        <Download size={14} className={loading ? 'animate-bounce' : ''} />
        {loading ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && (
        <span className="text-xs text-red-500" data-testid="export-error">{error}</span>
      )}
    </div>
  );
}
