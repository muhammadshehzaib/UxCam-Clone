import { getSession, getSessionEvents } from '@/lib/api';
import ReplayViewerClient from '@/components/replay/ReplayViewerClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface Props {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ seek?: string; from?: string }>;
}

function backLabel(from: string): string {
  if (from.startsWith('/users'))    return 'Back to User';
  if (from.startsWith('/crashes'))  return 'Back to Crashes';
  if (from.startsWith('/segments')) return 'Back to Segments';
  if (from.startsWith('/feedback')) return 'Back to Feedback';
  return 'Back to Sessions';
}

async function getDOMFrames(sessionId: string) {
  try {
    const API_URL = process.env.API_URL ?? 'http://localhost:3001';
    const TOKEN   = process.env.DASHBOARD_TOKEN ?? 'dev-dashboard-token';
    const res = await fetch(`${API_URL}/api/v1/sessions/${sessionId}/dom`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const body = await res.json() as { data: unknown[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}

export const revalidate = 0;

export default async function SessionReplayPage({ params, searchParams }: Props) {
  const { id }             = await params;
  const { seek, from }     = await searchParams;

  const initialSeekMs = seek ? Math.max(0, parseInt(seek)) : undefined;
  const backHref      = from ?? '/sessions';
  const backText      = from ? backLabel(from) : 'Back to Sessions';

  let session  = null;
  let events   = null;
  let domFrames: unknown[] = [];

  try {
    [session, events, domFrames] = await Promise.all([
      getSession(id),
      getSessionEvents(id),
      getDOMFrames(id),
    ]);
  } catch {
    notFound();
  }

  if (!session) notFound();

  return (
    <div>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        {backText}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Session Replay</h1>
          <p className="text-slate-500 text-sm mt-1 font-mono">{id}</p>
        </div>
        {domFrames.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
            ● DOM Recording
          </span>
        )}
      </div>

      <ReplayViewerClient
        session={session}
        events={events ?? []}
        initialSeekMs={initialSeekMs}
        domFrames={domFrames as Array<{ data: string; elapsed_ms: number; type: string }>}
      />
    </div>
  );
}
