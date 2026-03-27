import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ReplayCanvas from '@/components/replay/ReplayCanvas';
import { SessionEvent, NetworkFailure } from '@/types';

function makeClick(id: number, elapsed_ms: number, x = 0.5, y = 0.5): SessionEvent {
  return { id, type: 'click', elapsed_ms, timestamp: '', x, y, target: null, screen_name: null, value: null, metadata: {} };
}
function makeInput(id: number, elapsed_ms: number, target = 'form > input'): SessionEvent {
  return { id, type: 'input', elapsed_ms, timestamp: '', x: 0.5, y: 0.5, target, screen_name: null, value: '3', metadata: {} };
}

const NET_FAILURE: NetworkFailure = { elapsed_ms: 5000, url: '/api/pay', method: 'POST', status: 503, duration_ms: 200 };

const BASE_PROPS = { screenWidth: 390, screenHeight: 844 };

describe('ReplayCanvas — enhanced', () => {
  it('renders without crashing with no events', () => {
    render(<ReplayCanvas events={[]} activeEventIndex={-1} {...BASE_PROPS} />);
    expect(screen.getByTestId('replay-canvas')).toBeInTheDocument();
  });

  it('shows click ripple for active click event', () => {
    const events = [makeClick(1, 1000)];
    const { container } = render(<ReplayCanvas events={events} activeEventIndex={0} {...BASE_PROPS} />);
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });

  it('renders click trail dots for previous clicks', () => {
    const events = [makeClick(1, 500), makeClick(2, 1000), makeClick(3, 1500)];
    render(<ReplayCanvas events={events} activeEventIndex={2} {...BASE_PROPS} />);
    // Trail = previous clicks (not the active one) → 2 dots
    expect(screen.getAllByTestId('click-trail-dot')).toHaveLength(2);
  });

  it('click trail has at most 4 non-active dots (5 total - 1 active)', () => {
    const events = Array.from({ length: 10 }, (_, i) => makeClick(i, (i + 1) * 500));
    render(<ReplayCanvas events={events} activeEventIndex={9} {...BASE_PROPS} />);
    // At most 4 trail dots (5 total buffer minus active)
    expect(screen.getAllByTestId('click-trail-dot').length).toBeLessThanOrEqual(4);
  });

  it('network badge appears when failure is within 3s of currentTimeMs', () => {
    render(
      <ReplayCanvas
        events={[]} activeEventIndex={-1} {...BASE_PROPS}
        currentTimeMs={6000}
        networkFailures={[NET_FAILURE]}
      />
    );
    expect(screen.getByTestId('network-failure-badge')).toBeInTheDocument();
  });

  it('network badge does NOT appear when failure is older than 3s', () => {
    render(
      <ReplayCanvas
        events={[]} activeEventIndex={-1} {...BASE_PROPS}
        currentTimeMs={9000}
        networkFailures={[NET_FAILURE]}
      />
    );
    expect(screen.queryByTestId('network-failure-badge')).not.toBeInTheDocument();
  });

  it('network badge shows method and status', () => {
    render(
      <ReplayCanvas
        events={[]} activeEventIndex={-1} {...BASE_PROPS}
        currentTimeMs={5500}
        networkFailures={[NET_FAILURE]}
      />
    );
    const badge = screen.getByTestId('network-failure-badge');
    expect(badge).toHaveTextContent('POST');
    expect(badge).toHaveTextContent('503');
  });

  it('no network badge when networkFailures is empty', () => {
    render(<ReplayCanvas events={[]} activeEventIndex={-1} {...BASE_PROPS} currentTimeMs={5000} networkFailures={[]} />);
    expect(screen.queryByTestId('network-failure-badge')).not.toBeInTheDocument();
  });

  it('input indicator shows target selector for input events', () => {
    const events = [makeInput(1, 1000, 'div > form > input.email')];
    render(<ReplayCanvas events={events} activeEventIndex={0} {...BASE_PROPS} />);
    const indicator = screen.getByTestId('input-indicator');
    expect(indicator).toHaveTextContent('div > form > input.email');
  });

  it('no input indicator for non-input events', () => {
    const events = [makeClick(1, 1000)];
    render(<ReplayCanvas events={events} activeEventIndex={0} {...BASE_PROPS} />);
    expect(screen.queryByTestId('input-indicator')).not.toBeInTheDocument();
  });
});
