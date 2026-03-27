import { getUsers } from '@/lib/api';
import { AppUser } from '@/types';
import { formatDateTime, truncate } from '@/lib/utils';
import Link from 'next/link';
import Pagination from '@/components/ui/Pagination';
import ExportButton from '@/components/ui/ExportButton';
import TraitFilter from '@/components/users/TraitFilter';
import { Suspense } from 'react';

interface Props {
  searchParams: Promise<{
    page?:        string;
    device?:      string;
    os?:          string;
    browser?:     string;
    minDuration?: string;
    rageClick?:   string;
    search?:      string;
    traitKey?:    string | string[];
    traitVal?:    string | string[];
  }>;
}

export const revalidate = 0;

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page   = Math.max(1, parseInt(params.page ?? '1'));

  let result = null;
  try {
    result = await getUsers({
      page,
      limit:       20,
      device:      params.device,
      os:          params.os,
      browser:     params.browser,
      minDuration: params.minDuration,
      rageClick:   params.rageClick === 'true' ? true : undefined,
      search:      params.search,
      traitFilters: traitKeys.map((k, i) => ({ key: k, value: traitVals[i] ?? '' })).filter((f) => f.key && f.value),
    });
  } catch {
    // API not available
  }

  const users: AppUser[] = result?.data ?? [];
  const total      = result?.meta.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const traitKeys = params.traitKey ? (Array.isArray(params.traitKey) ? params.traitKey : [params.traitKey]) : [];
  const traitVals = params.traitVal ? (Array.isArray(params.traitVal) ? params.traitVal : [params.traitVal]) : [];
  const isFiltered  = !!(params.device || params.os || params.browser || params.minDuration || params.rageClick || traitKeys.length);
  const isSearching = !!params.search;

  // Build export URL with same filters
  const exportQs = new URLSearchParams();
  if (params.device)      exportQs.set('device',      params.device);
  if (params.os)          exportQs.set('os',          params.os);
  if (params.browser)     exportQs.set('browser',     params.browser);
  if (params.minDuration) exportQs.set('minDuration', params.minDuration);
  if (params.rageClick)   exportQs.set('rageClick',   params.rageClick);
  if (params.search)      exportQs.set('search',      params.search);
  const exportPath = `/users/export.csv?${exportQs}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total > 0
              ? `${total.toLocaleString()} users${isFiltered || isSearching ? ' matching filters' : ' tracked'}`
              : 'No users yet'}
          </p>
        </div>
        <ExportButton path={exportPath} filename="users.csv" />
      </div>

      {/* Trait filter */}
      <div className="mb-4">
        <Suspense fallback={null}>
          <TraitFilter />
        </Suspense>
      </div>

      {/* Search bar */}
      <form method="GET" action="/users" className="mb-4">
        {/* Preserve other filters */}
        {params.device      && <input type="hidden" name="device"      value={params.device} />}
        {params.os          && <input type="hidden" name="os"          value={params.os} />}
        {params.browser     && <input type="hidden" name="browser"     value={params.browser} />}
        {params.minDuration && <input type="hidden" name="minDuration" value={params.minDuration} />}
        {params.rageClick   && <input type="hidden" name="rageClick"   value={params.rageClick} />}
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="search"
            defaultValue={params.search ?? ''}
            placeholder="Search by name, email or user ID…"
            className="flex-1 max-w-sm px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            data-testid="user-search-input"
          />
          <button
            type="submit"
            className="px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            data-testid="user-search-submit"
          >
            Search
          </button>
          {isSearching && (
            <Link
              href={`/users${isFiltered ? `?${new URLSearchParams({ device: params.device ?? '', os: params.os ?? '' }).toString()}` : ''}`}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
              data-testid="user-search-clear"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {isFiltered && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 mb-6 text-sm text-brand-700">
          Filtered by segment —
          <Link href="/users" className="underline hover:text-brand-900">
            Clear filters
          </Link>
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400">
            {isFiltered || isSearching
              ? 'No users match these filters.'
              : 'No users yet. Generate a session using the SDK test harness.'}
          </p>
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
          <Suspense fallback={null}>
            <Pagination currentPage={page} totalPages={totalPages} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
