import { ScreenFlowNode } from '@/types';

interface ScreenSummaryCardsProps {
  nodes: ScreenFlowNode[];
}

function truncate(s: string, max = 28): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function CardSection({
  title,
  items,
  countKey,
  testId,
}: {
  title:    string;
  items:    ScreenFlowNode[];
  countKey: 'entry_count' | 'exit_count';
  testId:   string;
}) {
  const maxCount = items.length > 0 ? Math.max(...items.map((n) => n[countKey])) : 0;

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
      data-testid={testId}
    >
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
        {title}
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400" data-testid={`${testId}-empty`}>
          No data yet
        </p>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 8).map((node) => {
            const count    = node[countKey];
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={node.screen}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span
                    className="font-mono text-slate-700 truncate"
                    data-testid={`${testId}-screen`}
                  >
                    {truncate(node.screen)}
                  </span>
                  <span
                    className="font-medium text-slate-600 ml-2 flex-shrink-0"
                    data-testid={`${testId}-count`}
                  >
                    {count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      countKey === 'entry_count' ? 'bg-emerald-500' : 'bg-rose-400'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ScreenSummaryCards({ nodes }: ScreenSummaryCardsProps) {
  const byEntry = [...nodes].sort((a, b) => b.entry_count - a.entry_count);
  const byExit  = [...nodes].sort((a, b) => b.exit_count  - a.exit_count);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CardSection
        title="Entry Screens"
        items={byEntry}
        countKey="entry_count"
        testId="entry-card"
      />
      <CardSection
        title="Exit Screens"
        items={byExit}
        countKey="exit_count"
        testId="exit-card"
      />
    </div>
  );
}
