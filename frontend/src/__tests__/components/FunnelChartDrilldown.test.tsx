import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import FunnelChart from '@/components/funnels/FunnelChart';
import { FunnelStepResult } from '@/types';

jest.mock('next/link', () => {
  const Link = ({ children, href, 'data-testid': testId }: { children: React.ReactNode; href: string; 'data-testid'?: string }) => (
    <a href={href} data-testid={testId}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

const STEPS: FunnelStepResult[] = [
  { screen: '/home',     count: 1000, dropoff: 0,   dropoff_pct: 0,  conversion_pct: 100 },
  { screen: '/checkout', count: 800,  dropoff: 200, dropoff_pct: 20, conversion_pct: 80  },
  { screen: '/success',  count: 500,  dropoff: 300, dropoff_pct: 37, conversion_pct: 50  },
];

describe('FunnelChart — drilldown links', () => {
  it('each step screen name renders as a link', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.getByTestId('funnel-step-link-0')).toBeInTheDocument();
    expect(screen.getByTestId('funnel-step-link-1')).toBeInTheDocument();
    expect(screen.getByTestId('funnel-step-link-2')).toBeInTheDocument();
  });

  it('step link points to /sessions?screen=<screen>', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.getByTestId('funnel-step-link-0')).toHaveAttribute('href', '/sessions?screen=%2Fhome');
    expect(screen.getByTestId('funnel-step-link-1')).toHaveAttribute('href', '/sessions?screen=%2Fcheckout');
  });

  it('drop-off row renders as a clickable link', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.getByTestId('funnel-dropoff-link-0')).toBeInTheDocument();
    expect(screen.getByTestId('funnel-dropoff-link-1')).toBeInTheDocument();
  });

  it('drop-off link points to sessions with that step screen', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.getByTestId('funnel-dropoff-link-0')).toHaveAttribute('href', '/sessions?screen=%2Fhome');
  });

  it('last step has no drop-off link', () => {
    render(<FunnelChart steps={STEPS} />);
    expect(screen.queryByTestId('funnel-dropoff-link-2')).not.toBeInTheDocument();
  });

  it('encodes special characters in screen name', () => {
    const stepsWithSpecial: FunnelStepResult[] = [
      { screen: '/product/item?id=1', count: 100, dropoff: 0, dropoff_pct: 0, conversion_pct: 100 },
      { screen: '/cart',              count: 80,  dropoff: 20, dropoff_pct: 20, conversion_pct: 80 },
    ];
    render(<FunnelChart steps={stepsWithSpecial} />);
    const href = screen.getByTestId('funnel-step-link-0').getAttribute('href');
    expect(href).toContain(encodeURIComponent('/product/item?id=1'));
  });
});
