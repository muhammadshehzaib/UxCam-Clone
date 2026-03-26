import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimelineBar from '@/components/replay/TimelineBar';
import { SessionEvent } from '@/types';

function makeEvent(type: string, elapsed_ms: number): SessionEvent {
  return { id: elapsed_ms, type, elapsed_ms, timestamp: '', x: null, y: null, target: null, screen_name: null, value: null, metadata: {} };
}

const EVENTS: SessionEvent[] = [
  makeEvent('click',    1000),
  makeEvent('scroll',   3000),
  makeEvent('navigate', 5000),
];

const DURATION = 10000;

describe('TimelineBar', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a dot for each event (up to 200)', () => {
    const { container } = render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} />
    );
    // 3 event dots + 1 scrubber thumb
    const dots = container.querySelectorAll('.absolute.rounded-full');
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it('renders no rage markers when rageTimestamps is empty', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} rageTimestamps={[]} />
    );
    expect(screen.queryAllByTestId('rage-marker')).toHaveLength(0);
  });

  it('renders one rage marker per timestamp', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} rageTimestamps={[2000]} />
    );
    expect(screen.getAllByTestId('rage-marker')).toHaveLength(1);
  });

  it('renders multiple rage markers when multiple timestamps provided', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} rageTimestamps={[1000, 5000, 8000]} />
    );
    expect(screen.getAllByTestId('rage-marker')).toHaveLength(3);
  });

  it('rage markers have correct tooltip with seconds', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} rageTimestamps={[3500]} />
    );
    const marker = screen.getByTestId('rage-marker');
    expect(marker).toHaveAttribute('title', 'Rage click at 3.5s');
  });

  it('positions rage markers as percentage of duration', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={10000} currentTimeMs={0} onSeek={jest.fn()} rageTimestamps={[5000]} />
    );
    const marker = screen.getByTestId('rage-marker');
    // 5000/10000 = 50%
    expect(marker).toHaveStyle({ left: '50%' });
  });

  it('renders no rage markers when rageTimestamps prop is omitted', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} />
    );
    expect(screen.queryAllByTestId('rage-marker')).toHaveLength(0);
  });

  it('calls onSeek when the bar is clicked', async () => {
    const onSeek = jest.fn();
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={onSeek} />
    );
    await userEvent.click(screen.getByRole('generic', { hidden: true }));
    // onSeek is called — exact value depends on jsdom layout (0 width), just check it's called
    expect(onSeek).toHaveBeenCalled();
  });

  it('scrubber thumb position reflects currentTimeMs', () => {
    const { container } = render(
      <TimelineBar events={EVENTS} durationMs={10000} currentTimeMs={5000} onSeek={jest.fn()} />
    );
    // Progress = 50%
    const thumb = container.querySelector('.border-brand-500');
    expect(thumb).toHaveStyle({ left: '50%' });
  });
});
