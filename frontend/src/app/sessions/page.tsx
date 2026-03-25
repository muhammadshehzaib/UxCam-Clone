import { getSessions } from '@/lib/api';
import SessionTable from '@/components/sessions/SessionTable';
import Pagination from '@/components/ui/Pagination';

interface Props {
  searchParams: Promise<{ page?: string; device?: string }>;
}

export const revalidate = 0;

export default async function SessionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1'));
  const device = params.device;

  let result = null;
  try {
    result = await getSessions({ page, limit: 20, device });
  } catch {
    // API not available
  }

  const sessions = result?.data ?? [];
  const total = result?.meta.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total > 0 ? `${total.toLocaleString()} sessions recorded` : 'No sessions yet'}
          </p>
        </div>
      </div>

      <SessionTable sessions={sessions} />

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
