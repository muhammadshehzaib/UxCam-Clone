import { getSession, getSessionEvents } from '@/lib/api';
import ReplayViewerClient from '@/components/replay/ReplayViewerClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cookies } from 'next/headers';

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

async function getDOMFrames(sessionId: string, token: string) {
  try {
    // Force internal networking for server-side fetch
    const API_URL = 'http://uxclone-api:3001';
    
    console.log(`[Dashboard:getDOMFrames] Calling API: ${API_URL}/api/v1/sessions/${sessionId}/dom`);
    
    const res = await fetch(`${API_URL}/api/v1/sessions/${sessionId}/dom`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[Dashboard:getDOMFrames] API error ${res.status}`);
      return [];
    }
    const body = await res.json() as { data: unknown[] };
    return body.data ?? [];
  } catch (err) {
    console.error('[Dashboard:getDOMFrames] Fetch failed:', err);
    return [];
  }
}

export const revalidate = 0;

export default async function SessionReplayPage({ params, searchParams }: Props) {
  const { id }             = await params;
  const { seek, from }     = await searchParams;
  const cookieStore        = await cookies();
  const token              = cookieStore.get('uxclone_token')?.value ?? '';

  const initialSeekMs = seek ? Math.max(0, parseInt(seek)) : undefined;
  const backHref      = from ?? '/sessions';
  const backText      = from ? backLabel(from) : 'Back to Sessions';

  let session  = null;
  let events   = null;
  let domFrames: unknown[] = [];
  let error: string | null = null;

  try {
    console.log(`[Dashboard:SessionReplayPage] Fetching data for session ${id}`);
    
    [session, events, domFrames] = await Promise.all([
      getSession(id, token),
      getSessionEvents(id, token),
      getDOMFrames(id, token),
    ]);
  } catch (err: any) {
    console.error('[Dashboard:SessionReplayPage] Data fetch failed:', err);
    error = err.message || 'Failed to load session data';
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h2 className="text-lg font-bold mb-2">Failed to load replay</h2>
        <p className="text-sm">{error}</p>
        <Link href="/sessions" className="mt-4 inline-block text-red-600 underline text-sm font-medium">
          Return to Sessions
        </Link>
      </div>
    );
  }

  if (!session) {
    console.warn(`[Dashboard:SessionReplayPage] Session ${id} not found in database or belongs to another project.`);
    // We'll show a friendly error instead of hard 404 during this final verification phase
    return (
      <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
        <h2 className="text-lg font-bold mb-2">Session Not Found</h2>
        <p className="text-sm">We couldn't find session <strong>{id}</strong>. It may have been deleted or belongs to a different project.</p>
        <Link href="/sessions" className="mt-4 inline-block text-amber-600 underline text-sm font-medium">
          Return to Sessions
        </Link>
      </div>
    );
  }

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
            ● DOM Recording Available
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
