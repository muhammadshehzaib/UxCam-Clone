import { FunnelStepResult } from '@/types';

interface FunnelChartProps {
  steps: FunnelStepResult[];
}

export default function FunnelChart({ steps }: FunnelChartProps) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No data yet — run sessions that include these screens
      </div>
    );
  }

  const maxCount = steps[0].count;

  return (
    <div className="space-y-1" data-testid="funnel-chart">
      {steps.map((step, i) => {
        const barWidth = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
        const isLast = i === steps.length - 1;

        return (
          <div key={step.screen}>
            {/* Step row */}
            <div className="flex items-center gap-4 py-2">
              {/* Step number */}
              <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>

              {/* Screen name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {step.screen}
                  </span>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <span className="text-sm font-semibold text-slate-800">
                      {step.count.toLocaleString()}
                    </span>
                    <span
                      className="text-xs font-semibold w-12 text-right"
                      style={{ color: step.conversion_pct === 100 ? '#22c55e' : step.conversion_pct > 50 ? '#f59e0b' : '#ef4444' }}
                    >
                      {step.conversion_pct}%
                    </span>
                  </div>
                </div>
                <div className="h-7 bg-slate-100 rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: i === 0 ? '#6366f1' : `hsl(${244 - i * 20}, 80%, ${55 + i * 5}%)`,
                    }}
                    data-testid={`funnel-bar-${i}`}
                  />
                </div>
              </div>
            </div>

            {/* Drop-off connector (between steps) */}
            {!isLast && step.dropoff > 0 && (
              <div className="flex items-center gap-4 py-1 ml-10">
                <div className="flex-1 flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-px h-4 bg-slate-200 ml-2" />
                  <span className="text-red-500 font-medium">
                    −{step.dropoff.toLocaleString()} dropped ({step.dropoff_pct}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
