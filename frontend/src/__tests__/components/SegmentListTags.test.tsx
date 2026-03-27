import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SegmentList from '@/components/segments/SegmentList';
import { Segment } from '@/types';

jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
  Link.displayName = 'Link';
  return Link;
});
jest.mock('@/lib/api', () => ({ deleteSegment: jest.fn() }));

const SEGMENT_WITH_TAGS: Segment = {
  id: 's1', project_id: 'p1', name: 'Bug sessions',
  filters: { tags: ['bug', 'important'] }, created_at: '',
};

const SEGMENT_TAGS_AND_DEVICE: Segment = {
  id: 's2', project_id: 'p1', name: 'Mobile bugs',
  filters: { device: 'mobile', tags: ['bug'] }, created_at: '',
};

describe('SegmentList — tags', () => {
  it('shows tag pill when segment has tags', () => {
    render(<SegmentList segments={[SEGMENT_WITH_TAGS]} onDeleted={jest.fn()} />);
    expect(screen.getByText(/bug, important/i)).toBeInTheDocument();
  });

  it('Apply to Sessions link includes ?tags= when segment has tags', () => {
    render(<SegmentList segments={[SEGMENT_WITH_TAGS]} onDeleted={jest.fn()} />);
    const link = screen.getByTestId('apply-sessions-s1');
    expect(link.getAttribute('href')).toContain('tags=bug%2Cimportant');
  });

  it('Apply to Users link includes ?tags= when segment has tags', () => {
    render(<SegmentList segments={[SEGMENT_WITH_TAGS]} onDeleted={jest.fn()} />);
    const link = screen.getByTestId('apply-users-s1');
    expect(link.getAttribute('href')).toContain('tags=');
  });

  it('segment with tags AND device includes both in link', () => {
    render(<SegmentList segments={[SEGMENT_TAGS_AND_DEVICE]} onDeleted={jest.fn()} />);
    const link = screen.getByTestId('apply-sessions-s2');
    expect(link.getAttribute('href')).toContain('device=mobile');
    expect(link.getAttribute('href')).toContain('tags=bug');
  });

  it('segment with only tags (no device/OS) shows tag pill', () => {
    render(<SegmentList segments={[SEGMENT_WITH_TAGS]} onDeleted={jest.fn()} />);
    expect(screen.getAllByTestId('filter-pill').some(p => p.textContent?.includes('bug'))).toBe(true);
  });
});
