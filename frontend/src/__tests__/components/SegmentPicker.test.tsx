import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SegmentPicker from '@/components/segments/SegmentPicker';
import { Segment } from '@/types';

const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter:       () => ({ push: mockPush }),
  usePathname:     () => '/sessions',
  useSearchParams: () => mockSearchParams,
}));

const mockGetSegments = jest.fn();
jest.mock('@/lib/api', () => ({ getSegments: () => mockGetSegments() }));

const SEGMENTS: Segment[] = [
  { id: 's1', project_id: 'p1', name: 'Mobile iOS',    filters: { device: 'mobile', os: 'iOS' }, created_at: '' },
  { id: 's2', project_id: 'p1', name: 'Rage sessions', filters: { rageClick: true },             created_at: '' },
];

describe('SegmentPicker', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGetSegments.mockResolvedValue(SEGMENTS);
  });

  it('renders trigger button', () => {
    render(<SegmentPicker />);
    expect(screen.getByTestId('segment-picker-trigger')).toBeInTheDocument();
  });

  it('dropdown is hidden by default', () => {
    render(<SegmentPicker />);
    expect(screen.queryByTestId('segment-picker-dropdown')).not.toBeInTheDocument();
  });

  it('opens dropdown on trigger click', async () => {
    render(<SegmentPicker />);
    await userEvent.click(screen.getByTestId('segment-picker-trigger'));
    expect(screen.getByTestId('segment-picker-dropdown')).toBeInTheDocument();
  });

  it('shows all segments in dropdown', async () => {
    render(<SegmentPicker />);
    await userEvent.click(screen.getByTestId('segment-picker-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('segment-picker-option-s1')).toBeInTheDocument();
      expect(screen.getByTestId('segment-picker-option-s2')).toBeInTheDocument();
    });
  });

  it('shows "No saved segments" message when list is empty', async () => {
    mockGetSegments.mockResolvedValue([]);
    render(<SegmentPicker />);
    await userEvent.click(screen.getByTestId('segment-picker-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('segment-picker-empty')).toBeInTheDocument();
    });
  });

  it('calls router.push with correct URL params when segment is selected', async () => {
    render(<SegmentPicker />);
    await userEvent.click(screen.getByTestId('segment-picker-trigger'));
    await waitFor(() => screen.getByTestId('segment-picker-option-s1'));
    await userEvent.click(screen.getByTestId('segment-picker-option-s1'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('device=mobile')
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('os=iOS')
    );
  });

  it('rageClick segments include rageClick=true in URL', async () => {
    render(<SegmentPicker />);
    await userEvent.click(screen.getByTestId('segment-picker-trigger'));
    await waitFor(() => screen.getByTestId('segment-picker-option-s2'));
    await userEvent.click(screen.getByTestId('segment-picker-option-s2'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('rageClick=true')
    );
  });

  it('navigates to /sessions path with filters', async () => {
    render(<SegmentPicker />);
    await userEvent.click(screen.getByTestId('segment-picker-trigger'));
    await waitFor(() => screen.getByTestId('segment-picker-option-s1'));
    await userEvent.click(screen.getByTestId('segment-picker-option-s1'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringMatching(/^\/sessions\?/)
    );
  });

  it('"Save current filters" button visible when URL has active filters', async () => {
    // Set active filter on searchParams
    const activeParams = new URLSearchParams('device=mobile');
    jest.spyOn(require('next/navigation'), 'useSearchParams').mockReturnValue(activeParams);

    render(<SegmentPicker />);
    await userEvent.click(screen.getByTestId('segment-picker-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('save-current-filters-btn')).toBeInTheDocument();
    });
  });
});
