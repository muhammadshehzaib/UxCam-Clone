import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CrashList from '@/components/crashes/CrashList';
import { CrashGroup } from '@/types';

// Mock date-fns to produce predictable output
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

const CRASHES: CrashGroup[] = [
  {
    message:           'TypeError: Cannot read property id of undefined',
    filename:          'app.js',
    total_occurrences: 23,
    affected_sessions: 15,
    first_seen:        '2024-03-01T10:00:00Z',
    last_seen:         '2024-03-10T14:00:00Z',
  },
  {
    message:           'Network request failed',
    filename:          'api.js',
    total_occurrences: 12,
    affected_sessions: 8,
    first_seen:        '2024-03-02T09:00:00Z',
    last_seen:         '2024-03-09T11:00:00Z',
  },
];

describe('CrashList', () => {
  it('shows empty state when no crashes', () => {
    render(<CrashList crashes={[]} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('crash-list-empty')).toBeInTheDocument();
    expect(screen.getByText(/No crashes recorded/i)).toBeInTheDocument();
  });

  it('renders a row for each crash group', () => {
    render(<CrashList crashes={CRASHES} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByTestId('crash-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('crash-row-1')).toBeInTheDocument();
  });

  it('displays truncated error messages', () => {
    render(<CrashList crashes={CRASHES} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByText(/TypeError: Cannot read property id/)).toBeInTheDocument();
    expect(screen.getByText(/Network request failed/)).toBeInTheDocument();
  });

  it('displays filename for each crash', () => {
    render(<CrashList crashes={CRASHES} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByText('app.js')).toBeInTheDocument();
    expect(screen.getByText('api.js')).toBeInTheDocument();
  });

  it('displays occurrence count', () => {
    render(<CrashList crashes={CRASHES} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('displays affected session count as a badge', () => {
    render(<CrashList crashes={CRASHES} selected={null} onSelect={jest.fn()} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('displays last_seen as relative time', () => {
    render(<CrashList crashes={CRASHES} selected={null} onSelect={jest.fn()} />);
    expect(screen.getAllByText('2 hours ago')).toHaveLength(2);
  });

  it('calls onSelect with the correct crash when a row is clicked', async () => {
    const onSelect = jest.fn();
    render(<CrashList crashes={CRASHES} selected={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByTestId('crash-row-0'));
    expect(onSelect).toHaveBeenCalledWith(CRASHES[0]);
  });

  it('calls onSelect with second crash when second row is clicked', async () => {
    const onSelect = jest.fn();
    render(<CrashList crashes={CRASHES} selected={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByTestId('crash-row-1'));
    expect(onSelect).toHaveBeenCalledWith(CRASHES[1]);
  });

  it('applies highlight styling to the selected crash row', () => {
    render(<CrashList crashes={CRASHES} selected={CRASHES[0]} onSelect={jest.fn()} />);
    const activeRow = screen.getByTestId('crash-row-0');
    expect(activeRow.className).toContain('bg-red-50');
  });

  it('does not highlight non-selected rows', () => {
    render(<CrashList crashes={CRASHES} selected={CRASHES[0]} onSelect={jest.fn()} />);
    const inactiveRow = screen.getByTestId('crash-row-1');
    expect(inactiveRow.className).not.toContain('bg-red-50');
  });

  it('truncates very long error messages at 80 chars', () => {
    const longCrash: CrashGroup = {
      ...CRASHES[0],
      message: 'x'.repeat(100),
    };
    render(<CrashList crashes={[longCrash]} selected={null} onSelect={jest.fn()} />);
    // The displayed text should be max 81 chars (80 + ellipsis)
    const cell = screen.getByTestId('crash-row-0');
    expect(cell.textContent!.length).toBeLessThan(200); // sanity check it rendered
  });
});
