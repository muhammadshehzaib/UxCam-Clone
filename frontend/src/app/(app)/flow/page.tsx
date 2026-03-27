import { getScreenFlow } from '@/lib/api';
import ScreenFlowTable from '@/components/flow/ScreenFlowTable';
import ScreenSummaryCards from '@/components/flow/ScreenSummaryCards';
import DaysFilter from '@/components/ui/DaysFilter';
import { Workflow } from 'lucide-react';

interface Props {
  searchParams: Promise<{ days?: string }>;
}

export const revalidate = 0;

export default async function FlowPage({ searchParams }: Props) {
  const { days: daysStr } = await searchParams;
  const days = Math.min(90, Math.max(1, parseInt(daysStr ?? '30') || 30));

  let data = null;
  try {
    data = await getScreenFlow(days);
  } catch {
    // API not available
  }

  const edges             = data?.edges             ?? [];
  const nodes             = data?.nodes             ?? [];
  const total_transitions = data?.total_transitions ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Workflow size={20} className="text-brand-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Screen Flow</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {total_transitions > 0
                ? `${total_transitions.toLocaleString()} transitions across ${nodes.length} screens`
                : 'How users navigate between screens'}
            </p>
          </div>
        </div>

        <DaysFilter days={days} basePath="/flow" />
      </div>

      {/* Transitions table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <ScreenFlowTable edges={edges} total_transitions={total_transitions} />
      </div>

      {/* Entry / exit summary cards */}
      <ScreenSummaryCards nodes={nodes} />
    </div>
  );
}
