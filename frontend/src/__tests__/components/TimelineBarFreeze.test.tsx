import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import TimelineBar from '@/components/replay/TimelineBar';
import { SessionEvent } from '@/types';

function makeEvent(type: string, elapsed_ms: number): SessionEvent {
  return { id: elapsed_ms, type, elapsed_ms, timestamp: '', x: null, y: null, target: null, screen_name: null, value: null, metadata: {} };
}

const EVENTS: SessionEvent[] = [
  makeEvent('click',  1000),
  makeEvent('scroll', 3000),
];

const DURATION = 10000;

describe('TimelineBar — freeze markers', () => {
  it('renders no freeze markers when freezeTimestamps is empty', () => {
    render(<TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} freezeTimestamps={[]} />);
    expect(screen.queryAllByTestId('freeze-marker')).toHaveLength(0);
  });

  it('renders no freeze markers when freezeTimestamps prop is omitted', () => {
    render(<TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} />);
    expect(screen.queryAllByTestId('freeze-marker')).toHaveLength(0);
  });

  it('renders one freeze marker per timestamp', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()}
        freezeTimestamps={[4000]} />
    );
    expect(screen.getAllByTestId('freeze-marker')).toHaveLength(1);
  });

  it('renders multiple freeze markers', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()}
        freezeTimestamps={[2000, 5000, 8000]} />
    );
    expect(screen.getAllByTestId('freeze-marker')).toHaveLength(3);
  });

  it('freeze marker has correct tooltip with seconds', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()}
        freezeTimestamps={[4500]} />
    );
    const marker = screen.getByTestId('freeze-marker');
    expect(marker).toHaveAttribute('title', 'UI freeze at 4.5s');
  });

  it('freeze marker positioned at correct left percentage', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={10000} currentTimeMs={0} onSeek={jest.fn()}
        freezeTimestamps={[5000]} />
    );
    const marker = screen.getByTestId('freeze-marker');
    // 5000 / 10000 = 50%
    expect(marker).toHaveStyle({ left: '50%' });
  });

  it('rage markers and freeze markers can coexist', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()}
        rageTimestamps={[2000]}
        freezeTimestamps={[6000]} />
    );
    expect(screen.getAllByTestId('freeze-marker')).toHaveLength(1);
    expect(screen.getAllByTestId('rage-marker')).toHaveLength(1);
  });
});
