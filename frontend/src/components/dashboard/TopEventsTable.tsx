interface TopEventsTableProps {
  events: Array<{ name: string; count: number }>;
  label?: string;
}

export default function TopEventsTable({ events, label = 'Top Events' }: TopEventsTableProps) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-400">No events yet</p>;
  }

  const max = events[0].count;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{label}</h3>
      <div className="space-y-2">
        {events.map((ev) => (
          <div key={ev.name}>
            <div className="flex justify-between text-xs text-slate-600 mb-0.5">
              <span className="truncate max-w-[200px]">{ev.name}</span>
              <span className="font-medium">{ev.count.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full"
                style={{ width: `${(ev.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
