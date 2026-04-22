import { getSessions } from '@/lib/api';
import SessionTable from '@/components/sessions/SessionTable';
import SessionFilters from '@/components/sessions/SessionFilters';
import Pagination from '@/components/ui/Pagination';
import ExportButton from '@/components/ui/ExportButton';
import { Suspense } from 'react';
import { cookies } from 'next/headers';

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
    tags?:        string;
    screen?:      string;
  }>;
}

export const revalidate = 0;

export default async function SessionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page   = Math.max(1, parseInt(params.page ?? '1'));
  const tags   = params.tags ? params.tags.split(',').filter(Boolean) : undefined;

  const cookieStore = await cookies();
  const token = cookieStore.get('uxclone_token')?.value;

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
      tags,
      screen:      params.screen,
    }, token);
  } catch {
    // API not available
  }

  const sessions   = result?.data ?? [];
  const total      = result?.meta.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const exportQs = new URLSearchParams();
  if (params.device)      exportQs.set('device',      params.device);
  if (params.os)          exportQs.set('os',          params.os);
  if (params.browser)     exportQs.set('browser',     params.browser);
  if (params.dateFrom)    exportQs.set('dateFrom',    params.dateFrom);
  if (params.dateTo)      exportQs.set('dateTo',      params.dateTo);
  if (params.minDuration) exportQs.set('minDuration', params.minDuration);
  if (params.rageClick)   exportQs.set('rageClick',   params.rageClick);
  if (params.tags)        exportQs.set('tags',        params.tags);
  const exportPath = `/sessions/export.csv?${exportQs}`;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sessions</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {total > 0 ? (
              <>
                Monitoring <span className="text-brand-600 font-bold">{total.toLocaleString()}</span> active user journeys
              </>
            ) : 'No session data detected yet'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton path={exportPath} filename="sessions.csv" />
        </div>
      </div>

      <div className="space-y-6">
        <Suspense fallback={<div className="h-20 bg-white/50 backdrop-blur rounded-2xl border border-slate-100 animate-pulse" />}>
          <SessionFilters />
        </Suspense>

        <SessionTable sessions={sessions} fromPath="/sessions" />

        {totalPages > 1 && (
          <div className="flex justify-center pt-4">
            <Suspense fallback={null}>
              <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
