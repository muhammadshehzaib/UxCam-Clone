import Link from 'next/link';
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
        const barWidth    = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
        const isLast      = i === steps.length - 1;
        const sessionHref = `/sessions?screen=${encodeURIComponent(step.screen)}`;

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
                  {/* Screen name — clickable link to sessions that reached this step */}
                  <Link
                    href={sessionHref}
                    className="text-sm font-medium text-brand-700 hover:underline truncate"
                    title={`View sessions that reached ${step.screen}`}
                    data-testid={`funnel-step-link-${i}`}
                  >
                    {step.screen}
                  </Link>
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
                      width:           `${barWidth}%`,
                      backgroundColor: i === 0 ? '#6366f1' : `hsl(${244 - i * 20}, 80%, ${55 + i * 5}%)`,
                    }}
                    data-testid={`funnel-bar-${i}`}
                  />
                </div>
              </div>
            </div>

            {/* Drop-off connector — link to sessions at this step */}
            {!isLast && step.dropoff > 0 && (
              <div className="flex items-center gap-4 py-1 ml-10">
                <div className="flex-1 flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-px h-4 bg-slate-200 ml-2" />
                  <Link
                    href={sessionHref}
                    className="text-red-500 font-medium hover:underline"
                    title={`View sessions at ${step.screen}`}
                    data-testid={`funnel-dropoff-link-${i}`}
                  >
                    −{step.dropoff.toLocaleString()} dropped ({step.dropoff_pct}%)
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
