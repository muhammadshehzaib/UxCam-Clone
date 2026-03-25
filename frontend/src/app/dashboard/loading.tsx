export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="h-4 w-20 bg-slate-100 rounded animate-pulse mb-3" />
            <div className="h-9 w-28 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="h-4 w-36 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="h-48 bg-slate-50 rounded animate-pulse" />
      </div>
    </div>
  );
}
