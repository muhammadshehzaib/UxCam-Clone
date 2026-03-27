import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CrashTrendChart from '@/components/crashes/CrashTrendChart';

jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) =>
      React.createElement('div', { 'data-testid': 'line-chart', 'data-rows': data?.length }, children),
    Line: () => React.createElement('div', { 'data-testid': 'line' }),
    XAxis: () => React.createElement('div'),
    YAxis: () => React.createElement('div'),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div'),
  };
});

const DATA = [
  { date: '2024-01-01', count: 3 },
  { date: '2024-01-02', count: 7 },
  { date: '2024-01-03', count: 2 },
];

describe('CrashTrendChart', () => {
  it('shows empty state when no data', () => {
    render(<CrashTrendChart data={[]} />);
    expect(screen.getByTestId('crash-trend-empty')).toBeInTheDocument();
    expect(screen.getByText(/No crashes/i)).toBeInTheDocument();
  });

  it('does not show empty state when data provided', () => {
    render(<CrashTrendChart data={DATA} />);
    expect(screen.queryByTestId('crash-trend-empty')).not.toBeInTheDocument();
  });

  it('renders chart container when data provided', () => {
    render(<CrashTrendChart data={DATA} />);
    expect(screen.getByTestId('crash-trend-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('passes correct row count to chart', () => {
    render(<CrashTrendChart data={DATA} />);
    expect(screen.getByTestId('line-chart').getAttribute('data-rows')).toBe('3');
  });
});
