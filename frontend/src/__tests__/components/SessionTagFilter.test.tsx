import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionFilters from '@/components/sessions/SessionFilters';

const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter:       () => ({ push: mockPush }),
  usePathname:     () => '/sessions',
  useSearchParams: () => mockSearchParams,
}));
jest.mock('@/components/segments/SegmentPicker', () => () => null);

describe('SessionFilters — tag chips', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders all 5 TAG_OPTIONS as chip buttons', () => {
    render(<SessionFilters />);
    expect(screen.getByTestId('tag-filter-bug')).toBeInTheDocument();
    expect(screen.getByTestId('tag-filter-important')).toBeInTheDocument();
    expect(screen.getByTestId('tag-filter-reviewed')).toBeInTheDocument();
    expect(screen.getByTestId('tag-filter-followup')).toBeInTheDocument();
    expect(screen.getByTestId('tag-filter-ux-issue')).toBeInTheDocument();
  });

  it('inactive tag has plain border styling', () => {
    render(<SessionFilters />);
    const btn = screen.getByTestId('tag-filter-bug');
    expect(btn.className).toContain('border-slate-200');
  });

  it('clicking an inactive tag adds it to URL as ?tags=bug', async () => {
    render(<SessionFilters />);
    await userEvent.click(screen.getByTestId('tag-filter-bug'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('tags=bug'));
  });

  it('active tag has coloured background styling', () => {
    const activeParams = new URLSearchParams('tags=bug');
    jest.spyOn(require('next/navigation'), 'useSearchParams').mockReturnValue(activeParams);
    render(<SessionFilters />);
    const btn = screen.getByTestId('tag-filter-bug');
    // Has inline backgroundColor style
    expect(btn).toHaveStyle({ backgroundColor: '#ef4444' });
  });

  it('clicking an active tag removes it from URL', async () => {
    const activeParams = new URLSearchParams('tags=bug');
    jest.spyOn(require('next/navigation'), 'useSearchParams').mockReturnValue(activeParams);
    render(<SessionFilters />);
    await userEvent.click(screen.getByTestId('tag-filter-bug'));
    // Should push URL without tags param
    expect(mockPush).toHaveBeenCalledWith(expect.not.stringContaining('tags=bug'));
  });

  it('active tags show in filter badge row', () => {
    const activeParams = new URLSearchParams('tags=bug,reviewed');
    jest.spyOn(require('next/navigation'), 'useSearchParams').mockReturnValue(activeParams);
    render(<SessionFilters />);
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Reviewed')).toBeInTheDocument();
  });
});
