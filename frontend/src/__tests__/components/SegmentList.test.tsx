import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SegmentList from '@/components/segments/SegmentList';
import { Segment } from '@/types';

jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

const mockDeleteSegment = jest.fn();
jest.mock('@/lib/api', () => ({ deleteSegment: (id: string) => mockDeleteSegment(id) }));

const SEGMENTS: Segment[] = [
  { id: 's1', project_id: 'p1', name: 'Mobile iOS',  filters: { device: 'mobile', os: 'iOS', rageClick: true }, created_at: '' },
  { id: 's2', project_id: 'p1', name: 'Long sessions', filters: { minDuration: 300 }, created_at: '' },
];

describe('SegmentList', () => {
  beforeEach(() => mockDeleteSegment.mockClear());

  it('shows empty state when no segments', () => {
    render(<SegmentList segments={[]} onDeleted={jest.fn()} />);
    expect(screen.getByTestId('segment-list-empty')).toBeInTheDocument();
  });

  it('renders one card per segment', () => {
    render(<SegmentList segments={SEGMENTS} onDeleted={jest.fn()} />);
    expect(screen.getByTestId('segment-item-s1')).toBeInTheDocument();
    expect(screen.getByTestId('segment-item-s2')).toBeInTheDocument();
  });

  it('displays segment name', () => {
    render(<SegmentList segments={SEGMENTS} onDeleted={jest.fn()} />);
    expect(screen.getByText('Mobile iOS')).toBeInTheDocument();
    expect(screen.getByText('Long sessions')).toBeInTheDocument();
  });

  it('displays filter pills for each filter', () => {
    render(<SegmentList segments={SEGMENTS} onDeleted={jest.fn()} />);
    const pills = screen.getAllByTestId('filter-pill');
    // s1 has 3 filters, s2 has 1 → 4 total
    expect(pills.length).toBe(4);
  });

  it('shows "Rage clicks" filter pill for rageClick: true', () => {
    render(<SegmentList segments={SEGMENTS} onDeleted={jest.fn()} />);
    expect(screen.getByText('Rage clicks')).toBeInTheDocument();
  });

  it('"Apply to Sessions" link has correct href with filter params', () => {
    render(<SegmentList segments={SEGMENTS} onDeleted={jest.fn()} />);
    const link = screen.getByTestId('apply-sessions-s1');
    expect(link.getAttribute('href')).toContain('device=mobile');
    expect(link.getAttribute('href')).toContain('os=iOS');
    expect(link.getAttribute('href')).toContain('rageClick=true');
  });

  it('"Apply to Users" link points to /users with filter params', () => {
    render(<SegmentList segments={SEGMENTS} onDeleted={jest.fn()} />);
    const link = screen.getByTestId('apply-users-s1');
    expect(link.getAttribute('href')).toMatch(/^\/users\?/);
  });

  it('calls deleteSegment with correct id on delete', async () => {
    mockDeleteSegment.mockResolvedValue(undefined);
    const onDeleted = jest.fn();
    render(<SegmentList segments={SEGMENTS} onDeleted={onDeleted} />);
    await userEvent.click(screen.getByTestId('delete-segment-s1'));
    await waitFor(() => expect(mockDeleteSegment).toHaveBeenCalledWith('s1'));
  });

  it('calls onDeleted callback after successful delete', async () => {
    mockDeleteSegment.mockResolvedValue(undefined);
    const onDeleted = jest.fn();
    render(<SegmentList segments={SEGMENTS} onDeleted={onDeleted} />);
    await userEvent.click(screen.getByTestId('delete-segment-s2'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it('minDuration pill shows value in seconds', () => {
    render(<SegmentList segments={SEGMENTS} onDeleted={jest.fn()} />);
    expect(screen.getByText('Min: 300s')).toBeInTheDocument();
  });
});
