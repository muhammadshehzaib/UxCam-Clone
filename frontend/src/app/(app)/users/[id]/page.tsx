import { getUser, getUserSessions } from '@/lib/api';
import SessionTable from '@/components/sessions/SessionTable';
import Pagination from '@/components/ui/Pagination';
import { formatDateTime } from '@/lib/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Suspense } from 'react';

interface Props {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export const revalidate = 0;

export default async function UserDetailPage({ params, searchParams }: Props) {
  const { id }   = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1'));

  let user = null;
  let sessionsResult = null;

  try {
    [user, sessionsResult] = await Promise.all([
      getUser(id),
      getUserSessions(id, { page }),
    ]);
  } catch {
    notFound();
  }

  if (!user) notFound();

  const totalSessions = sessionsResult?.meta.total ?? 0;
  const totalPages    = Math.ceil(totalSessions / 20);

  return (
    <div>
      {/* Back link */}
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Users
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {user.external_id ?? 'Anonymous User'}
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-mono">{user.anonymous_id}</p>
      </div>

      {/* Traits card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">User Profile</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-slate-500 text-xs mb-1">User ID</dt>
            <dd className="font-medium text-slate-800">{user.external_id ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs mb-1">Name</dt>
            <dd className="font-medium text-slate-800">{String(user.traits?.name ?? '—')}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs mb-1">Email</dt>
            <dd className="font-medium text-slate-800">{String(user.traits?.email ?? '—')}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs mb-1">Sessions</dt>
            <dd className="font-medium text-slate-800">{user.session_count}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs mb-1">First Seen</dt>
            <dd className="font-medium text-slate-800">{formatDateTime(user.first_seen_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 text-xs mb-1">Last Seen</dt>
            <dd className="font-medium text-slate-800">{formatDateTime(user.last_seen_at)}</dd>
          </div>
        </dl>
      </div>

      {/* Sessions */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Sessions
        {totalSessions > 0 && (
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({totalSessions.toLocaleString()})
          </span>
        )}
      </h2>
      <SessionTable sessions={sessionsResult?.data ?? []} fromPath={`/users/${id}`} />

      {totalPages > 1 && (
        <div className="mt-6">
          <Suspense fallback={null}>
            <Pagination currentPage={page} totalPages={totalPages} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
