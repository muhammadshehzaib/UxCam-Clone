import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SessionTable from '@/components/sessions/SessionTable';
import { Session } from '@/types';

// Mock next/link
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    anonymous_id: 'anon-abc',
    user_id: null,
    started_at: '2024-03-01T10:00:00Z',
    ended_at: '2024-03-01T10:05:00Z',
    duration_ms: 300000,
    device_type: 'desktop',
    os: 'macOS',
    os_version: null,
    browser: 'Chrome',
    browser_version: null,
    app_version: null,
    country: null,
    city: null,
    screen_width: 1440,
    screen_height: 900,
    event_count: 42,
    metadata: null,
    external_id: null,
    traits: null,
    ...overrides,
  };
}

describe('SessionTable', () => {
  it('shows empty state when sessions array is empty', () => {
    render(<SessionTable sessions={[]} />);
    expect(screen.getByText(/No sessions yet/i)).toBeInTheDocument();
  });

  it('renders a row for each session', () => {
    render(<SessionTable sessions={[makeSession(), makeSession({ id: 'sess-2' })]} />);
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header + 2 data rows
  });

  it('shows anonymous_id when external_id is null', () => {
    render(<SessionTable sessions={[makeSession({ anonymous_id: 'anon-xyz', external_id: null })]} />);
    expect(screen.getByText(/anon-xyz/)).toBeInTheDocument();
  });

  it('shows external_id when present', () => {
    render(<SessionTable sessions={[makeSession({ external_id: 'user@example.com' })]} />);
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('shows event count', () => {
    render(<SessionTable sessions={[makeSession({ event_count: 87 })]} />);
    expect(screen.getByText('87')).toBeInTheDocument();
  });

  it('does NOT show rage badge when metadata is null', () => {
    render(<SessionTable sessions={[makeSession({ metadata: null })]} />);
    expect(screen.queryByText('Rage')).not.toBeInTheDocument();
  });

  it('does NOT show rage badge when metadata.rage_click is false', () => {
    render(<SessionTable sessions={[makeSession({ metadata: { rage_click: false } })]} />);
    expect(screen.queryByText('Rage')).not.toBeInTheDocument();
  });

  it('does NOT show rage badge when metadata.rage_click is undefined', () => {
    render(<SessionTable sessions={[makeSession({ metadata: {} })]} />);
    expect(screen.queryByText('Rage')).not.toBeInTheDocument();
  });

  it('shows red Rage badge when metadata.rage_click is true', () => {
    render(<SessionTable sessions={[makeSession({ metadata: { rage_click: true } })]} />);
    const badge = screen.getByText('Rage');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('red');
  });

  it('shows Rage badge only on the affected session, not others', () => {
    render(<SessionTable sessions={[
      makeSession({ id: 'sess-1', metadata: { rage_click: true } }),
      makeSession({ id: 'sess-2', metadata: null }),
    ]} />);
    expect(screen.getAllByText('Rage')).toHaveLength(1);
  });

  it('renders a Replay link per session', () => {
    render(<SessionTable sessions={[makeSession({ id: 'sess-abc' })]} />);
    const link = screen.getByRole('link', { name: /replay/i });
    expect(link).toHaveAttribute('href', '/sessions/sess-abc');
  });
});
