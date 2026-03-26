import { getFunnels, getHeatmapScreens } from '@/lib/api';
import FunnelList from '@/components/funnels/FunnelList';
import FunnelBuilder from '@/components/funnels/FunnelBuilder';
import { GitBranch } from 'lucide-react';

export const revalidate = 0;

export default async function FunnelsPage() {
  let funnels = [];
  let screenNames: string[] = [];

  try {
    [funnels, screenNames] = await Promise.all([getFunnels(), getHeatmapScreens(30)]);
  } catch {
    // API not available
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <GitBranch size={20} className="text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Funnels</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track how users move through key screen sequences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Saved funnels */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Saved Funnels ({funnels.length})
          </h2>
          <FunnelList funnels={funnels} />
        </div>

        {/* Builder */}
        <div className="lg:col-span-2">
          <FunnelBuilder screenNames={screenNames} />
        </div>
      </div>
    </div>
  );
}
