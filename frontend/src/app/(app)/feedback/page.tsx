import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';
import DaysFilter from '@/components/ui/DaysFilter';

interface FeedbackItem {
  session_id:   string;
  elapsed_ms:   number;
  screen_name:  string | null;
  submitted_at: string;
  message:      string;
  rating:       number | null;
  user_email:   string | null;
}

interface Props {
  searchParams: Promise<{ days?: string }>;
}

export const revalidate = 0;

export default async function FeedbackPage({ searchParams }: Props) {
  const { days: daysStr } = await searchParams;
  const days = Math.min(90, Math.max(1, parseInt(daysStr ?? '30') || 30));

  let feedback: FeedbackItem[] = [];
  try {
    const API_URL = process.env.API_URL ?? 'http://localhost:3001';
    const TOKEN   = process.env.DASHBOARD_TOKEN ?? 'dev-dashboard-token';
    const res = await fetch(`${API_URL}/api/v1/analytics/feedback?days=${days}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }, cache: 'no-store',
    });
    if (res.ok) {
      const body = await res.json() as { data: FeedbackItem[] };
      feedback = body.data;
    }
  } catch { /* API not available */ }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MessageSquare size={20} className="text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Feedback</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {feedback.length > 0
                ? `${feedback.length} feedback submissions`
                : 'Submitted via UXClone.feedback() or the feedback widget'}
            </p>
          </div>
        </div>
        <DaysFilter days={days} basePath="/feedback" />
      </div>

      {feedback.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <p className="text-sm font-medium">No feedback yet</p>
          <p className="text-xs mt-1">Use <code className="bg-slate-100 px-1 rounded">UXClone.feedback()</code> or <code className="bg-slate-100 px-1 rounded">UXClone.enableFeedbackWidget()</code></p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((fb, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{fb.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    {fb.user_email && <span>{fb.user_email}</span>}
                    {fb.screen_name && <span>{fb.screen_name}</span>}
                    <span>{formatDateTime(fb.submitted_at)}</span>
                    {fb.rating && <span>{'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}</span>}
                  </div>
                </div>
                <Link
                  href={`/sessions/${fb.session_id}?seek=${fb.elapsed_ms}&from=%2Ffeedback`}
                  className="flex-shrink-0 text-xs px-3 py-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg transition-colors"
                >
                  View Replay
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
