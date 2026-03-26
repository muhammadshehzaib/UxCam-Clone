'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-4 text-red-400" size={40} />
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-xs">
          {error.message || 'An unexpected error occurred. Is the API running?'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
