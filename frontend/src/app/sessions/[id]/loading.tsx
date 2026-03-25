export default function ReplayLoading() {
  return (
    <div>
      <div className="h-4 w-28 bg-slate-200 rounded animate-pulse mb-6" />
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
      <div className="flex gap-6">
        {/* Canvas skeleton */}
        <div className="w-[320px] h-[568px] bg-slate-200 rounded-2xl animate-pulse flex-shrink-0" />
        {/* Info panel skeleton */}
        <div className="flex-1 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="mb-3">
                <div className="h-3 w-16 bg-slate-100 rounded animate-pulse mb-1" />
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Timeline skeleton */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-8 bg-slate-100 rounded animate-pulse mb-3" />
        <div className="h-9 bg-slate-50 rounded animate-pulse" />
      </div>
    </div>
  );
}
