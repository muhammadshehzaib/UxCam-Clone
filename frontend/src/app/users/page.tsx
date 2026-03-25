import { getUsers } from '@/lib/api';
import { AppUser } from '@/types';
import { formatDateTime, truncate } from '@/lib/utils';
import Link from 'next/link';
import Pagination from '@/components/ui/Pagination';

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export const revalidate = 0;

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1'));

  let result = null;
  try {
    result = await getUsers({ page, limit: 20 });
  } catch {
    // API not available
  }

  const users: AppUser[] = result?.data ?? [];
  const total = result?.meta.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 text-sm mt-1">
          {total > 0 ? `${total.toLocaleString()} users tracked` : 'No users yet'}
        </p>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400">No users yet. Generate a session using the SDK test harness.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">First Seen</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Seen</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/users/${u.id}`} className="hover:text-brand-600 transition-colors">
                      <div className="font-medium text-slate-800">
                        {u.external_id
                          ? truncate(u.external_id, 24)
                          : <span className="text-slate-400 font-mono text-xs">{truncate(u.anonymous_id, 20)}</span>
                        }
                      </div>
                      {u.traits?.name && (
                        <div className="text-xs text-slate-500">{String(u.traits.name)}</div>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(u.first_seen_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(u.last_seen_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{u.session_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
