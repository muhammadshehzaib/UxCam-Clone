interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({ label, value, sub, icon }: MetricCardProps) {
  return (
    <div className="glass-card p-6 rounded-2xl group hover:border-brand-500/20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors">{value}</p>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:brand-gradient group-hover:text-white group-hover:shadow-bloom transform transition-all duration-300 group-hover:rotate-6 group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>
      {sub && (
        <div className="flex items-center gap-1.5 translate-y-1">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{sub}</p>
        </div>
      )}
    </div>
  );
}
