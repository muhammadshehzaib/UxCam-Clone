import { formatDuration, intervalToDuration } from 'date-fns';

export function formatMs(ms: number | null | undefined): string {
  if (!ms) return '—';
  const d = intervalToDuration({ start: 0, end: ms });
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return formatDuration(d, { format: ['minutes', 'seconds'] });
}

export function formatMsShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(str: string | null | undefined, len = 20): string {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function getDeviceIcon(deviceType: string | null): string {
  switch (deviceType) {
    case 'mobile': return '📱';
    case 'tablet': return '💻';
    default: return '🖥️';
  }
}

export const EVENT_COLORS: Record<string, string> = {
  click: '#3B82F6',
  scroll: '#9CA3AF',
  navigate: '#8B5CF6',
  input: '#F59E0B',
  custom: '#F97316',
  screen_view: '#14B8A6',
};
