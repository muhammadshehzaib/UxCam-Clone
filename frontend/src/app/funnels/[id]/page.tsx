import Link from 'next/link';
import { getFunnels, getFunnelResults } from '@/lib/api';
import FunnelList from '@/components/funnels/FunnelList';
import FunnelChart from '@/components/funnels/FunnelChart';
import { ChevronLeft } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string }>;
}

export const revalidate = 0;

export default async function FunnelDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { days: daysStr } = await searchParams;
  const days = Math.min(90, Math.max(1, parseInt(daysStr ?? '30') || 30));

  let funnels = [];
  let results = null;

  try {
    [funnels, results] = await Promise.all([getFunnels(), getFunnelResults(id, days)]);
  } catch {
    // API not available
  }

  const funnel = results?.funnel;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/funnels"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft size={16} />
          Funnels
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-bold text-slate-900">
          {funnel?.name ?? 'Funnel'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Saved funnels sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Saved Funnels
          </h2>
          <FunnelList funnels={funnels} activeFunnelId={id} />
        </div>

        {/* Funnel results */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {/* Summary */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-slate-500">
                {results
                  ? `${results.total_sessions.toLocaleString()} sessions entered this funnel`
                  : 'No data yet'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {([7, 30, 90] as const).map((d) => (
                <Link
                  key={d}
                  href={`/funnels/${id}?days=${d}`}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    days === d
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {d}d
                </Link>
              ))}
            </div>
          </div>

          <FunnelChart steps={results?.steps ?? []} />
        </div>
      </div>
    </div>
  );
}
