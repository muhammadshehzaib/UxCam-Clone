import { getSummary, getSessionsOverTime } from '@/lib/api';
import MetricCard from '@/components/dashboard/MetricCard';
import SessionChart from '@/components/dashboard/SessionChart';
import TopEventsTable from '@/components/dashboard/TopEventsTable';
import { formatMs } from '@/lib/utils';
import { Users, PlaySquare, Clock, Zap } from 'lucide-react';

export const revalidate = 60;

export default async function DashboardPage() {
  let summary = null;
  let chartData: Array<{ date: string; count: number }> = [];

  try {
    [summary, chartData] = await Promise.all([
      getSummary(30),
      getSessionsOverTime(30),
    ]);
  } catch {
    // API not running yet — show empty state
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Last 30 days</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Users"
          value={summary?.totalUsers.toLocaleString() ?? '—'}
          icon={<Users size={18} />}
        />
        <MetricCard
          label="Total Sessions"
          value={summary?.totalSessions.toLocaleString() ?? '—'}
          icon={<PlaySquare size={18} />}
        />
        <MetricCard
          label="Avg Session Duration"
          value={summary ? formatMs(summary.avgSessionDurationMs) : '—'}
          icon={<Clock size={18} />}
        />
        <MetricCard
          label="Top Event Count"
          value={summary?.topEvents[0]?.count.toLocaleString() ?? '—'}
          sub={summary?.topEvents[0]?.name}
          icon={<Zap size={18} />}
        />
      </div>

      {/* Sessions chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Sessions Over Time</h2>
        <SessionChart data={chartData} />
      </div>

      {/* Top events + screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <TopEventsTable events={summary?.topEvents ?? []} label="Top Custom Events" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <TopEventsTable events={summary?.topScreens ?? []} label="Top Screens" />
        </div>
      </div>
    </div>
  );
}
