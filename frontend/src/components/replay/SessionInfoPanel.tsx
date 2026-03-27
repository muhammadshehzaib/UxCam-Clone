import { Session } from '@/types';
import { formatDateTime, formatMs, getDeviceIcon } from '@/lib/utils';
import SessionNoteEditor from './SessionNoteEditor';
import BookmarkButton from '@/components/sessions/BookmarkButton';

interface SessionInfoPanelProps {
  session: Session;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}

export default function SessionInfoPanel({ session }: SessionInfoPanelProps) {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Session Info
        </h3>
        <BookmarkButton sessionId={session.id} bookmarked={session.is_bookmarked ?? false} size={16} />
      </div>
      <dl className="space-y-3">
        <InfoRow label="Session ID" value={session.id.slice(0, 8) + '…'} />
        <InfoRow label="User" value={session.external_id ?? session.anonymous_id.slice(0, 12) + '…'} />
        <InfoRow label="Started" value={formatDateTime(session.started_at)} />
        <InfoRow label="Duration" value={formatMs(session.duration_ms)} />
        <InfoRow label="Events" value={session.event_count} />
        <div className="border-t border-slate-200 pt-3 mt-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Device</h4>
        </div>
        <InfoRow
          label="Device"
          value={`${getDeviceIcon(session.device_type)} ${session.device_type ?? '—'}`}
        />
        <InfoRow label="OS" value={session.os ? `${session.os} ${session.os_version ?? ''}`.trim() : null} />
        <InfoRow label="Browser" value={session.browser ? `${session.browser} ${session.browser_version ?? ''}`.trim() : null} />
        <InfoRow label="App Version" value={session.app_version} />
        <InfoRow
          label="Screen"
          value={
            session.screen_width && session.screen_height
              ? `${session.screen_width} × ${session.screen_height}`
              : null
          }
        />
        {(session.country || session.city) && (
          <InfoRow label="Location" value={[session.city, session.country].filter(Boolean).join(', ')} />
        )}
      </dl>

      {/* Notes & Tags — client component for interactivity */}
      <SessionNoteEditor
        sessionId={session.id}
        initialNote={session.metadata?.note ?? ''}
        initialTags={session.metadata?.tags ?? []}
      />
    </div>
  );
}
