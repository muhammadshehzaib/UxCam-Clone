import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ScreenFlowTable from '@/components/flow/ScreenFlowTable';
import { ScreenFlowEdge } from '@/types';

const EDGES: ScreenFlowEdge[] = [
  { from_screen: '/home',     to_screen: '/products', transition_count: 562 },
  { from_screen: '/products', to_screen: '/cart',     transition_count: 341 },
  { from_screen: '/home',     to_screen: '/signup',   transition_count: 189 },
];

describe('ScreenFlowTable', () => {
  it('shows empty state when edges array is empty', () => {
    render(<ScreenFlowTable edges={[]} total_transitions={0} />);
    expect(screen.getByTestId('flow-table-empty')).toBeInTheDocument();
    expect(screen.getByText(/No navigation data yet/i)).toBeInTheDocument();
  });

  it('does not render table when edges is empty', () => {
    render(<ScreenFlowTable edges={[]} total_transitions={0} />);
    expect(screen.queryByTestId('flow-table')).not.toBeInTheDocument();
  });

  it('renders one row per edge', () => {
    render(<ScreenFlowTable edges={EDGES} total_transitions={1092} />);
    expect(screen.getByTestId('flow-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('flow-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('flow-row-2')).toBeInTheDocument();
  });

  it('displays from_screen for each row', () => {
    render(<ScreenFlowTable edges={EDGES} total_transitions={1092} />);
    expect(screen.getAllByText('/home')).not.toHaveLength(0);
    expect(screen.getByText('/products')).toBeInTheDocument();
  });

  it('displays to_screen for each row', () => {
    render(<ScreenFlowTable edges={EDGES} total_transitions={1092} />);
    expect(screen.getByText('/cart')).toBeInTheDocument();
    expect(screen.getByText('/signup')).toBeInTheDocument();
  });

  it('displays transition_count for each row', () => {
    render(<ScreenFlowTable edges={EDGES} total_transitions={1092} />);
    expect(screen.getByText('562')).toBeInTheDocument();
    expect(screen.getByText('341')).toBeInTheDocument();
    expect(screen.getByText('189')).toBeInTheDocument();
  });

  it('first row bar is 100% width (highest count)', () => {
    render(<ScreenFlowTable edges={EDGES} total_transitions={1092} />);
    const bar = screen.getByTestId('flow-bar-0');
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('subsequent bars are proportionally narrower than first', () => {
    render(<ScreenFlowTable edges={EDGES} total_transitions={1092} />);
    const bar1 = screen.getByTestId('flow-bar-1');
    const bar2 = screen.getByTestId('flow-bar-2');
    // 341/562 ≈ 60.7%, 189/562 ≈ 33.6%
    const expectedBar1 = `${(341 / 562) * 100}%`;
    const expectedBar2 = `${(189 / 562) * 100}%`;
    expect(bar1).toHaveStyle({ width: expectedBar1 });
    expect(bar2).toHaveStyle({ width: expectedBar2 });
  });

  it('shows total transitions count in header', () => {
    render(<ScreenFlowTable edges={EDGES} total_transitions={1092} />);
    expect(screen.getByText(/1,092 total transitions/i)).toBeInTheDocument();
  });

  it('renders arrow separator between from and to screen', () => {
    render(<ScreenFlowTable edges={EDGES} total_transitions={1092} />);
    // ArrowRight icon is mocked as svg with data-testid="icon"
    const arrows = screen.getAllByTestId('arrow-icon');
    expect(arrows.length).toBe(EDGES.length);
  });
});
