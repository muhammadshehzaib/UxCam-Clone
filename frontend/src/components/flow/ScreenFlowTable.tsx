import { ScreenFlowEdge } from '@/types';
import { ArrowRight } from 'lucide-react';

interface ScreenFlowTableProps {
  edges:             ScreenFlowEdge[];
  total_transitions: number;
}

export default function ScreenFlowTable({ edges, total_transitions }: ScreenFlowTableProps) {
  if (edges.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-slate-400"
        data-testid="flow-table-empty"
      >
        <p className="text-sm font-medium">No navigation data yet</p>
        <p className="text-xs mt-1">Sessions with screen navigation will appear here</p>
      </div>
    );
  }

  const maxCount = edges[0].transition_count; // already sorted DESC

  return (
    <div data-testid="flow-table">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">Top Transitions</h2>
        <span className="text-xs text-slate-400">
          {total_transitions.toLocaleString()} total transitions
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-50">
        {edges.map((edge, i) => {
          const barWidth = maxCount > 0 ? (edge.transition_count / maxCount) * 100 : 0;
          return (
            <div key={i} className="px-5 py-3" data-testid={`flow-row-${i}`}>
              {/* Screen pair */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-mono text-slate-700 truncate max-w-[180px]">
                  {edge.from_screen}
                </span>
                <ArrowRight size={13} className="text-slate-400 flex-shrink-0" data-testid="arrow-icon" />
                <span className="text-sm font-mono text-slate-700 truncate max-w-[180px]">
                  {edge.to_screen}
                </span>
                <span className="ml-auto flex-shrink-0 text-sm font-semibold text-slate-800">
                  {edge.transition_count.toLocaleString()}
                </span>
              </div>
              {/* Bar */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                  style={{ width: `${barWidth}%` }}
                  data-testid={`flow-bar-${i}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
