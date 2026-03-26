import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScreenPicker from '@/components/heatmaps/ScreenPicker';

const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter:       () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const SCREENS = ['/home', '/checkout', '/profile'];

describe('ScreenPicker', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders a select with all screen options', () => {
    render(<ScreenPicker screens={SCREENS} selected="/home" />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    expect(screen.getByRole('option', { name: '/home' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '/checkout' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '/profile' })).toBeInTheDocument();
  });

  it('shows the selected screen as current value', () => {
    render(<ScreenPicker screens={SCREENS} selected="/checkout" />);
    expect(screen.getByRole('combobox')).toHaveValue('/checkout');
  });

  it('shows empty state message when screens list is empty', () => {
    render(<ScreenPicker screens={[]} selected="" />);
    expect(screen.getByText('No screens recorded yet')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('calls router.push with updated screen param on change', async () => {
    render(<ScreenPicker screens={SCREENS} selected="/home" />);

    await userEvent.selectOptions(screen.getByRole('combobox'), '/checkout');

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('screen=%2Fcheckout')
    );
  });

  it('preserves existing search params when changing screen', async () => {
    const paramsWithDays = new URLSearchParams('days=7');
    jest.spyOn(require('next/navigation'), 'useSearchParams')
      .mockReturnValue(paramsWithDays);

    render(<ScreenPicker screens={SCREENS} selected="/home" />);

    await userEvent.selectOptions(screen.getByRole('combobox'), '/profile');

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain('days=7');
    expect(calledUrl).toContain('screen=');
  });

  it('navigates to /heatmaps route', async () => {
    render(<ScreenPicker screens={SCREENS} selected="/home" />);

    await userEvent.selectOptions(screen.getByRole('combobox'), '/profile');

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringMatching(/^\/heatmaps\?/)
    );
  });

  it('renders correct number of options', () => {
    render(<ScreenPicker screens={SCREENS} selected="/home" />);
    expect(screen.getAllByRole('option')).toHaveLength(SCREENS.length);
  });
});
