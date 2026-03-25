import { getSession, getSessionEvents } from '@/lib/api';
import ReplayViewerClient from '@/components/replay/ReplayViewerClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function SessionReplayPage({ params }: Props) {
  const { id } = await params;

  let session = null;
  let events = null;

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
      {/* Back link */}
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Sessions
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Session Replay</h1>
        <p className="text-slate-500 text-sm mt-1 font-mono">{id}</p>
      </div>

      <ReplayViewerClient session={session} events={events ?? []} />
    </div>
  );
}
