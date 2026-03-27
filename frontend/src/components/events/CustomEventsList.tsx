interface CustomEventsListProps {
  events:   Array<{ name: string; count: number }>;
  selected: string | null;
  onSelect: (name: string) => void;
}

export default function CustomEventsList({ events, selected, onSelect }: CustomEventsListProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 text-sm" data-testid="events-list-empty">
        No custom events yet — call <code className="mx-1 px-1 bg-slate-100 rounded">UXClone.track()</code> to record them
      </div>
    );
  }

  const maxCount = events[0].count;

  return (
    <div data-testid="events-list">
      <div className="divide-y divide-slate-50">
        {events.map((ev) => {
          const barWidth = maxCount > 0 ? (ev.count / maxCount) * 100 : 0;
          const isActive = ev.name === selected;
          return (
            <button
              key={ev.name}
              onClick={() => onSelect(ev.name)}
              className={`w-full text-left px-4 py-3 transition-colors ${isActive ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
              data-testid={`event-row-${ev.name}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-mono ${isActive ? 'text-brand-700 font-semibold' : 'text-slate-700'}`}>
                  {ev.name}
                </span>
                <span className="text-sm font-semibold text-slate-800 ml-4 flex-shrink-0">
                  {ev.count.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{ width: `${barWidth}%` }}
                  data-testid={`event-bar-${ev.name}`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
