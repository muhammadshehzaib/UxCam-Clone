'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { RetentionCohort } from '@/types';

interface RetentionChartProps {
  cohorts: RetentionCohort[];
}

export default function RetentionChart({ cohorts }: RetentionChartProps) {
  if (cohorts.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-48 text-slate-400 text-sm"
        data-testid="retention-chart-empty"
      >
        No cohort data yet — retention builds up over time
      </div>
    );
  }

  const formatted = cohorts.map((c) => ({
    week:   format(parseISO(String(c.cohort_week)), 'MMM d'),
    'D1 %': c.d1_pct,
    'D7 %': c.d7_pct,
    'D30 %': c.d30_pct,
  }));

  return (
    <div data-testid="retention-chart">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={formatted}
          margin={{ top: 4, right: 16, left: -8, bottom: 0 }}
          barCategoryGap="30%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`]}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
            labelStyle={{ color: '#64748b' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="D1 %"  fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey="D7 %"  fill="#f59e0b" radius={[3, 3, 0, 0]} />
          <Bar dataKey="D30 %" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
