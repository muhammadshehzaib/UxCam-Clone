'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Trash2 } from 'lucide-react';
import { Funnel } from '@/types';
import { deleteFunnel } from '@/lib/api';

interface FunnelListProps {
  funnels: Funnel[];
  activeFunnelId?: string;
}

export default function FunnelList({ funnels, activeFunnelId }: FunnelListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteFunnel(id);
      router.refresh();
    } catch {
      // silently ignore — user can retry
    } finally {
      setDeleting(null);
    }
  }

  if (funnels.length === 0) {
    return (
      <p className="text-xs text-slate-400 px-1 py-2">
        No funnels yet. Create one on the right.
      </p>
    );
  }

  return (
    <ul className="space-y-1" data-testid="funnel-list">
      {funnels.map((f) => {
        const isActive = f.id === activeFunnelId;
        return (
          <li key={f.id}>
            <Link
              href={`/funnels/${f.id}`}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors group ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              data-testid={`funnel-item-${f.id}`}
            >
              <span className="truncate flex-1">{f.name}</span>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <span className="text-xs text-slate-400">
                  {f.steps.length} steps
                </span>
                <button
                  onClick={(e) => handleDelete(e, f.id)}
                  disabled={deleting === f.id}
                  className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-all"
                  aria-label={`Delete funnel ${f.name}`}
                  data-testid={`delete-funnel-${f.id}`}
                >
                  <Trash2 size={12} />
                </button>
                <ChevronRight size={12} className="text-slate-300" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
