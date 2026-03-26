import { getUser, getUserSessions } from '@/lib/api';
import SessionTable from '@/components/sessions/SessionTable';
import { formatDateTime } from '@/lib/utils';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;

  let user = null;
  let sessionsResult = null;

  try {
    [user, sessionsResult] = await Promise.all([
      getUser(id),
      getUserSessions(id),
    ]);
  } catch {
    notFound();
  }

  if (!user) notFound();

  return (
    <div>
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
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Sessions</h2>
      <SessionTable sessions={sessionsResult?.data ?? []} />
    </div>
  );
}
