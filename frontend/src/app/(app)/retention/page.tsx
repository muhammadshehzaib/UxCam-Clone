import { getRetention } from '@/lib/api';
import RetentionCards from '@/components/retention/RetentionCards';
import RetentionChart from '@/components/retention/RetentionChart';
import DaysFilter from '@/components/ui/DaysFilter';
import { TrendingUp } from 'lucide-react';

interface Props {
  searchParams: Promise<{ days?: string }>;
}

export const revalidate = 0;

export default async function RetentionPage({ searchParams }: Props) {
  const { days: daysStr } = await searchParams;
  const days = Math.min(180, Math.max(1, parseInt(daysStr ?? '90') || 90));

  let data = null;
  try {
    data = await getRetention(days);
  } catch {
    // API not available
  }

  const summary  = data?.summary  ?? { total_users: 0, d1_pct: 0, d7_pct: 0, d30_pct: 0 };
  const cohorts  = data?.cohorts  ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-brand-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Retention</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              How many users come back after their first visit
            </p>
          </div>
        </div>

        <DaysFilter days={days} basePath="/retention" presets={[30, 60, 90]} />
      </div>

      {/* Summary cards */}
      <div className="mb-6">
        <RetentionCards summary={summary} />
      </div>

      {/* Cohort chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-700">Weekly Cohort Retention</h2>
          {cohorts.length > 0 && summary.d30_pct === 0 && (
            <p className="text-xs text-slate-400">
              D30 % will appear once cohorts are 30+ days old
            </p>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Each bar group = users who first visited that week
        </p>
        <RetentionChart cohorts={cohorts} />
      </div>
    </div>
  );
}
