import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CrashSessionList from '@/components/crashes/CrashSessionList';
import { CrashSession } from '@/types';

jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

const SESSIONS: CrashSession[] = [
  {
    id:               'sess-1',
    anonymous_id:     'anon-abc123',
    external_id:      'user@example.com',
    started_at:       '2024-03-10T10:00:00Z',
    duration_ms:      120000,
    device_type:      'mobile',
    os:               'iOS',
    crash_elapsed_ms: 45000,
  },
  {
    id:               'sess-2',
    anonymous_id:     'anon-xyz789',
    external_id:      null,
    started_at:       '2024-03-09T08:00:00Z',
    duration_ms:      90000,
    device_type:      'desktop',
    os:               'macOS',
    crash_elapsed_ms: 12000,
  },
];

describe('CrashSessionList', () => {
  it('shows empty state when no sessions', () => {
    render(<CrashSessionList sessions={[]} />);
    expect(screen.getByTestId('crash-sessions-empty')).toBeInTheDocument();
    expect(screen.getByText(/No sessions found/i)).toBeInTheDocument();
  });

  it('renders a row for each session', () => {
    render(<CrashSessionList sessions={SESSIONS} />);
    expect(screen.getByTestId('crash-session-list')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header + 2 data rows
  });

  it('shows external_id when available', () => {
    render(<CrashSessionList sessions={SESSIONS} />);
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('falls back to anonymous_id when external_id is null', () => {
    render(<CrashSessionList sessions={SESSIONS} />);
    expect(screen.getByText(/anon-xyz789/)).toBeInTheDocument();
  });

  it('shows OS for each session', () => {
    render(<CrashSessionList sessions={SESSIONS} />);
    expect(screen.getByText('iOS')).toBeInTheDocument();
    expect(screen.getByText('macOS')).toBeInTheDocument();
  });

  it('displays crash_elapsed_ms as human-readable time', () => {
    render(<CrashSessionList sessions={SESSIONS} />);
    // 45000ms = 45s, 12000ms = 12s
    expect(screen.getByText('45s')).toBeInTheDocument();
    expect(screen.getByText('12s')).toBeInTheDocument();
  });

  it('formats elapsed_ms over 60s as minutes and seconds', () => {
    const session: CrashSession = {
      ...SESSIONS[0],
      crash_elapsed_ms: 90000, // 1m 30s
    };
    render(<CrashSessionList sessions={[session]} />);
    expect(screen.getByText('1m 30s')).toBeInTheDocument();
  });

  it('replay link points to /sessions/:id?seek=<crash_elapsed_ms>', () => {
    render(<CrashSessionList sessions={SESSIONS} />);
    const link = screen.getByTestId('replay-link-sess-1');
    expect(link).toHaveAttribute('href', '/sessions/sess-1?seek=45000');
  });

  it('each session has its own correctly scoped replay link', () => {
    render(<CrashSessionList sessions={SESSIONS} />);
    const link2 = screen.getByTestId('replay-link-sess-2');
    expect(link2).toHaveAttribute('href', '/sessions/sess-2?seek=12000');
  });

  it('shows loading skeletons when loading prop is true', () => {
    const { container } = render(<CrashSessionList sessions={[]} loading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('does not show loading skeletons when loading is false', () => {
    const { container } = render(<CrashSessionList sessions={SESSIONS} loading={false} />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });
});
