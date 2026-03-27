import { getSessions } from '@/lib/api';
import SessionTable from '@/components/sessions/SessionTable';
import SessionFilters from '@/components/sessions/SessionFilters';
import Pagination from '@/components/ui/Pagination';
import ExportButton from '@/components/ui/ExportButton';
import { Suspense } from 'react';

interface Props {
  searchParams: Promise<{
    page?:        string;
    device?:      string;
    os?:          string;
    browser?:     string;
    dateFrom?:    string;
    dateTo?:      string;
    minDuration?: string;
    rageClick?:   string;
  }>;
}

export const revalidate = 0;

export default async function SessionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page   = Math.max(1, parseInt(params.page ?? '1'));

  let result = null;
  try {
    result = await getSessions({
      page,
      limit:       20,
      device:      params.device,
      os:          params.os,
      browser:     params.browser,
      dateFrom:    params.dateFrom,
      dateTo:      params.dateTo,
      minDuration: params.minDuration,
      rageClick:   params.rageClick === 'true' ? true : undefined,
    });
  } catch {
    // API not available
  }

  const sessions   = result?.data ?? [];
  const total      = result?.meta.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  // Build export URL with same filters (no page param)
  const exportQs = new URLSearchParams();
  if (params.device)      exportQs.set('device',      params.device);
  if (params.os)          exportQs.set('os',          params.os);
  if (params.browser)     exportQs.set('browser',     params.browser);
  if (params.dateFrom)    exportQs.set('dateFrom',    params.dateFrom);
  if (params.dateTo)      exportQs.set('dateTo',      params.dateTo);
  if (params.minDuration) exportQs.set('minDuration', params.minDuration);
  if (params.rageClick)   exportQs.set('rageClick',   params.rageClick);
  const exportPath = `/sessions/export.csv?${exportQs}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total > 0 ? `${total.toLocaleString()} sessions recorded` : 'No sessions yet'}
          </p>
        </div>
        <ExportButton path={exportPath} filename="sessions.csv" />
      </div>

      {/* Filters — wrapped in Suspense because it uses useSearchParams internally */}
      <Suspense fallback={<div className="h-16 bg-white border border-slate-200 rounded-xl animate-pulse mb-6" />}>
        <SessionFilters />
      </Suspense>

      <SessionTable sessions={sessions} />

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
