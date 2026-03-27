import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RetentionChart from '@/components/retention/RetentionChart';
import { RetentionCohort } from '@/types';

// Mock recharts so we can test without canvas/SVG
jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) =>
      React.createElement('div', { 'data-testid': 'bar-chart', 'data-rows': data?.length }, children),
    Bar: ({ dataKey }: { dataKey: string }) =>
      React.createElement('div', { 'data-testid': `bar-${dataKey}` }),
    XAxis: ({ dataKey }: { dataKey: string }) =>
      React.createElement('div', { 'data-testid': 'x-axis', 'data-key': dataKey }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div'),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
  };
});

const COHORTS: RetentionCohort[] = [
  { cohort_week: '2024-01-01T00:00:00.000Z', total: 150, d1_pct: 45.0, d7_pct: 31.0, d30_pct: 18.0 },
  { cohort_week: '2024-01-08T00:00:00.000Z', total: 120, d1_pct: 38.0, d7_pct: 25.0, d30_pct: 12.0 },
];

describe('RetentionChart', () => {
  it('shows empty state when cohorts array is empty', () => {
    render(<RetentionChart cohorts={[]} />);
    expect(screen.getByTestId('retention-chart-empty')).toBeInTheDocument();
    expect(screen.getByText(/No cohort data yet/i)).toBeInTheDocument();
  });

  it('does not show empty state when cohorts are provided', () => {
    render(<RetentionChart cohorts={COHORTS} />);
    expect(screen.queryByTestId('retention-chart-empty')).not.toBeInTheDocument();
  });

  it('renders the chart container when data exists', () => {
    render(<RetentionChart cohorts={COHORTS} />);
    expect(screen.getByTestId('retention-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('passes correct number of cohort groups to chart', () => {
    render(<RetentionChart cohorts={COHORTS} />);
    const chart = screen.getByTestId('bar-chart');
    expect(chart.getAttribute('data-rows')).toBe('2');
  });

  it('renders D1, D7, D30 bars', () => {
    render(<RetentionChart cohorts={COHORTS} />);
    expect(screen.getByTestId('bar-D1 %')).toBeInTheDocument();
    expect(screen.getByTestId('bar-D7 %')).toBeInTheDocument();
    expect(screen.getByTestId('bar-D30 %')).toBeInTheDocument();
  });

  it('renders legend component', () => {
    render(<RetentionChart cohorts={COHORTS} />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });
});
