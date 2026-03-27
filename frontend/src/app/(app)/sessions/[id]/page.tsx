import { getSession, getSessionEvents } from '@/lib/api';
import ReplayViewerClient from '@/components/replay/ReplayViewerClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface Props {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ seek?: string; from?: string }>;
}

/** Derive a human-readable back-link label from the `from` path. */
function backLabel(from: string): string {
  if (from.startsWith('/users'))   return 'Back to User';
  if (from.startsWith('/crashes')) return 'Back to Crashes';
  if (from.startsWith('/segments'))return 'Back to Segments';
  return 'Back to Sessions';
}

export const revalidate = 0;

export default async function SessionReplayPage({ params, searchParams }: Props) {
  const { id }   = await params;
  const { seek, from } = await searchParams;

  const initialSeekMs = seek ? Math.max(0, parseInt(seek)) : undefined;
  const backHref      = from ?? '/sessions';
  const backText      = from ? backLabel(from) : 'Back to Sessions';

  let session = null;
  let events  = null;

  try {
    [session, events] = await Promise.all([
      getSession(id),
      getSessionEvents(id),
    ]);
  } catch {
    notFound();
  }

  if (!session) notFound();

  return (
    <div>
      {/* Smart back link — respects where the user came from */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        {backText}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Session Replay</h1>
        <p className="text-slate-500 text-sm mt-1 font-mono">{id}</p>
      </div>

      <ReplayViewerClient session={session} events={events ?? []} initialSeekMs={initialSeekMs} />
    </div>
  );
}
