import { RetentionSummary } from '@/types';

interface RetentionCardsProps {
  summary: RetentionSummary;
}

interface CardProps {
  label:       string;
  pct:         number;
  sublabel?:   string;
  colorClass:  string;
  testId:      string;
}

function RetentionCard({ label, pct, sublabel, colorClass, testId }: CardProps) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
      data-testid={testId}
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        {label}
      </p>
      <p className={`text-4xl font-bold ${colorClass}`}>
        {pct.toFixed(1)}%
      </p>
      {sublabel && (
        <p className="text-xs text-slate-400 mt-2">{sublabel}</p>
      )}
    </div>
  );
}

export default function RetentionCards({ summary }: RetentionCardsProps) {
  if (summary.total_users === 0) {
    return (
      <div
        className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400"
        data-testid="retention-cards-empty"
      >
        <p className="text-sm font-medium">No user data yet</p>
        <p className="text-xs mt-1">Retention is calculated once users return for a second visit</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <RetentionCard
        label="Day 1 Return"
        pct={summary.d1_pct}
        sublabel={`${summary.total_users.toLocaleString()} new users in period`}
        colorClass="text-emerald-600"
        testId="retention-card-d1"
      />
      <RetentionCard
        label="Day 7 Return"
        pct={summary.d7_pct}
        sublabel="returned within 7 days"
        colorClass="text-amber-600"
        testId="retention-card-d7"
      />
      <RetentionCard
        label="Day 30 Return"
        pct={summary.d30_pct}
        sublabel="returned within 30 days"
        colorClass="text-sky-600"
        testId="retention-card-d30"
      />
    </div>
  );
}
