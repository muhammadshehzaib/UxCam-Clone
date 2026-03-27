'use client';

import { useState } from 'react';
import { Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { regenerateApiKey } from '@/lib/api';

interface ApiKeyCardProps {
  projectId:  string;
  initialKey: string;
}

function maskKey(key: string): string {
  if (key.length <= 8) return key;
  return `${key.slice(0, 12)}${'·'.repeat(16)}`;
}

export default function ApiKeyCard({ projectId, initialKey }: ApiKeyCardProps) {
  const [key,         setKey]         = useState(initialKey);
  const [revealed,    setRevealed]    = useState(false);
  const [confirming,  setConfirming]  = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  function copyKey() {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const newKey = await regenerateApiKey(projectId);
      setKey(newKey);
      setConfirming(false);
      setRevealed(true);
    } catch {
      setError('Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        API Key
      </h3>

      {/* Key display */}
      <div className="flex items-center gap-2 mb-3">
        <code
          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700 truncate"
          data-testid="api-key-display"
        >
          {revealed ? key : maskKey(key)}
        </code>
        <button
          onClick={() => setRevealed((v) => !v)}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label={revealed ? 'Hide key' : 'Reveal key'}
          data-testid="reveal-key-button"
        >
          {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          onClick={copyKey}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Copy API key"
          data-testid="copy-key-button"
        >
          <Copy size={14} />
        </button>
        {copied && <span className="text-xs text-emerald-600" data-testid="copied-indicator">Copied!</span>}
      </div>

      {/* Regenerate */}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
          data-testid="regenerate-trigger"
        >
          <RefreshCw size={12} />
          Regenerate key…
        </button>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2" data-testid="confirm-regenerate">
          <p className="text-xs text-amber-700">
            ⚠ This will invalidate the current key. Update your SDK integration before regenerating.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              data-testid="confirm-regenerate-button"
            >
              {regenerating ? 'Regenerating…' : 'Yes, regenerate'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2" data-testid="api-key-error">{error}</p>}
    </div>
  );
}
