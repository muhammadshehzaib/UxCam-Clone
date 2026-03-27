'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface CrashTrendChartProps {
  data: Array<{ date: string; count: number }>;
}

export default function CrashTrendChart({ data }: CrashTrendChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-24 text-slate-400 text-sm"
        data-testid="crash-trend-empty"
      >
        No crashes in this period
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    dateLabel: format(parseISO(String(d.date)), 'MMM d'),
  }));

  return (
    <div data-testid="crash-trend-chart">
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={formatted} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            labelStyle={{ color: '#64748b' }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="Crashes"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
