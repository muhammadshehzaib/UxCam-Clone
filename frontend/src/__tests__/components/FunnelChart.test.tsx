import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import FunnelChart from '@/components/funnels/FunnelChart';
import { FunnelStepResult } from '@/types';

const STEPS: FunnelStepResult[] = [
  { screen: '/home',      count: 1000, dropoff: 0,   dropoff_pct: 0,  conversion_pct: 100 },
  { screen: '/signup',    count: 800,  dropoff: 200, dropoff_pct: 20, conversion_pct: 80  },
  { screen: '/dashboard', count: 500,  dropoff: 300, dropoff_pct: 37, conversion_pct: 50  },
];

describe('FunnelChart', () => {
  it('shows empty state when steps array is empty', () => {
    render(<FunnelChart steps={[]} />);
    expect(screen.getByText(/No data yet/i)).toBeInTheDocument();
  });

  it('renders a row for each step', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.getByText('/home')).toBeInTheDocument();
    expect(screen.getByText('/signup')).toBeInTheDocument();
    expect(screen.getByText('/dashboard')).toBeInTheDocument();
  });

  it('displays session counts for each step', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('displays conversion percentage for each step', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows drop-off count and percentage between steps', () => {
    render(<FunnelChart steps={STEPS} />);
    // Drop-off between step 1 and 2: -200 (20%)
    expect(screen.getByText(/−200 dropped \(20%\)/)).toBeInTheDocument();
    // Drop-off between step 2 and 3: -300 (37%)
    expect(screen.getByText(/−300 dropped \(37%\)/)).toBeInTheDocument();
  });

  it('does not show drop-off row for the first step', () => {
    render(<FunnelChart steps={STEPS} />);
    // First step has dropoff=0 so no drop-off connector is rendered
    expect(screen.queryByText(/−0 dropped/)).not.toBeInTheDocument();
  });

  it('does not show drop-off after last step', () => {
    render(<FunnelChart steps={STEPS} />);
    // Only 2 drop-off rows for 3 steps
    const dropoffTexts = screen.getAllByText(/dropped/);
    expect(dropoffTexts).toHaveLength(2);
  });

  it('renders step numbers 1, 2, 3', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders a bar for each step', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.getByTestId('funnel-bar-0')).toBeInTheDocument();
    expect(screen.getByTestId('funnel-bar-1')).toBeInTheDocument();
    expect(screen.getByTestId('funnel-bar-2')).toBeInTheDocument();
  });

  it('first step bar is 100% width (full bar)', () => {
    render(<FunnelChart steps={STEPS} />);
    const bar = screen.getByTestId('funnel-bar-0');
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('subsequent bars are proportionally narrower', () => {
    render(<FunnelChart steps={STEPS} />);
    const bar1 = screen.getByTestId('funnel-bar-1');
    const bar2 = screen.getByTestId('funnel-bar-2');
    // step 1 = 800/1000 = 80%, step 2 = 500/1000 = 50%
    expect(bar1).toHaveStyle({ width: '80%' });
    expect(bar2).toHaveStyle({ width: '50%' });
  });

  it('handles a 2-step funnel correctly', () => {
    const twoSteps: FunnelStepResult[] = [
      { screen: '/a', count: 100, dropoff: 0,  dropoff_pct: 0,  conversion_pct: 100 },
      { screen: '/b', count: 40,  dropoff: 60, dropoff_pct: 60, conversion_pct: 40  },
    ];
    render(<FunnelChart steps={twoSteps} />);
    expect(screen.getByText('/a')).toBeInTheDocument();
    expect(screen.getByText('/b')).toBeInTheDocument();
    expect(screen.getByText(/−60 dropped \(60%\)/)).toBeInTheDocument();
  });
});
