import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ScreenSummaryCards from '@/components/flow/ScreenSummaryCards';
import { ScreenFlowNode } from '@/types';

const NODES: ScreenFlowNode[] = [
  { screen: '/home',     total_visits: 1000, entry_count: 600, exit_count:  50 },
  { screen: '/products', total_visits:  750, entry_count:  80, exit_count: 200 },
  { screen: '/cart',     total_visits:  400, entry_count:  20, exit_count: 150 },
];

describe('ScreenSummaryCards', () => {
  it('renders Entry Screens card', () => {
    render(<ScreenSummaryCards nodes={NODES} />);
    expect(screen.getByTestId('entry-card')).toBeInTheDocument();
    expect(screen.getByText('Entry Screens')).toBeInTheDocument();
  });

  it('renders Exit Screens card', () => {
    render(<ScreenSummaryCards nodes={NODES} />);
    expect(screen.getByTestId('exit-card')).toBeInTheDocument();
    expect(screen.getByText('Exit Screens')).toBeInTheDocument();
  });

  it('shows entry screen names in entry card', () => {
    render(<ScreenSummaryCards nodes={NODES} />);
    const entryCard = screen.getByTestId('entry-card');
    expect(entryCard).toHaveTextContent('/home');
    expect(entryCard).toHaveTextContent('/products');
  });

  it('shows entry counts in entry card', () => {
    render(<ScreenSummaryCards nodes={NODES} />);
    const entryCard = screen.getByTestId('entry-card');
    expect(entryCard).toHaveTextContent('600');
    expect(entryCard).toHaveTextContent('80');
  });

  it('shows exit screen names in exit card', () => {
    render(<ScreenSummaryCards nodes={NODES} />);
    const exitCard = screen.getByTestId('exit-card');
    expect(exitCard).toHaveTextContent('/products');
    expect(exitCard).toHaveTextContent('/cart');
  });

  it('shows exit counts in exit card', () => {
    render(<ScreenSummaryCards nodes={NODES} />);
    const exitCard = screen.getByTestId('exit-card');
    expect(exitCard).toHaveTextContent('200');
    expect(exitCard).toHaveTextContent('150');
  });

  it('shows empty state in entry card when nodes is empty', () => {
    render(<ScreenSummaryCards nodes={[]} />);
    expect(screen.getByTestId('entry-card-empty')).toBeInTheDocument();
  });

  it('shows empty state in exit card when nodes is empty', () => {
    render(<ScreenSummaryCards nodes={[]} />);
    expect(screen.getByTestId('exit-card-empty')).toBeInTheDocument();
  });

  it('entry card sorts nodes by entry_count descending', () => {
    render(<ScreenSummaryCards nodes={NODES} />);
    const entryScreens = screen.getAllByTestId('entry-card-screen');
    // /home has highest entry_count (600), should be first
    expect(entryScreens[0]).toHaveTextContent('/home');
  });

  it('exit card sorts nodes by exit_count descending', () => {
    render(<ScreenSummaryCards nodes={NODES} />);
    const exitScreens = screen.getAllByTestId('exit-card-screen');
    // /products has highest exit_count (200), should be first
    expect(exitScreens[0]).toHaveTextContent('/products');
  });

  it('entry card first bar is 100% width', () => {
    const { container } = render(<ScreenSummaryCards nodes={NODES} />);
    const entryCard = container.querySelector('[data-testid="entry-card"]');
    const firstBar  = entryCard?.querySelector('[style*="width"]') as HTMLElement | null;
    expect(firstBar?.style.width).toBe('100%');
  });
});
