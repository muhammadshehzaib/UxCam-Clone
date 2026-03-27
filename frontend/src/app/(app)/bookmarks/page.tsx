import { getBookmarks } from '@/lib/api';
import SessionTable from '@/components/sessions/SessionTable';
import { Bookmark } from 'lucide-react';

export const revalidate = 0;

export default async function BookmarksPage() {
  let sessions = [];
  try {
    sessions = await getBookmarks();
  } catch {
    // API not available
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Bookmark size={20} className="text-amber-500" fill="currentColor" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookmarks</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {sessions.length > 0
              ? `${sessions.length} bookmarked session${sessions.length !== 1 ? 's' : ''}`
              : 'Sessions you star will appear here'}
          </p>
        </div>
      </div>

      <SessionTable sessions={sessions} fromPath="/bookmarks" />
    </div>
  );
}
