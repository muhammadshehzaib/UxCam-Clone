import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import TimelineBar from '@/components/replay/TimelineBar';
import { SessionEvent, NetworkFailure } from '@/types';

function makeEvent(type: string, elapsed_ms: number): SessionEvent {
  return { id: elapsed_ms, type, elapsed_ms, timestamp: '', x: null, y: null, target: null, screen_name: null, value: null, metadata: {} };
}

const EVENTS: SessionEvent[] = [makeEvent('click', 1000), makeEvent('scroll', 3000)];
const DURATION = 10000;

const FAILURES: NetworkFailure[] = [
  { elapsed_ms: 4000, url: '/api/payment', method: 'POST', status: 503, duration_ms: 217 },
  { elapsed_ms: 7000, url: '/api/users',   method: 'GET',  status: 404, duration_ms: 89  },
];

describe('TimelineBar — network failure markers', () => {
  it('renders no network markers when networkFailures is empty', () => {
    render(<TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} networkFailures={[]} />);
    expect(screen.queryAllByTestId('network-marker')).toHaveLength(0);
  });

  it('renders no network markers when prop is omitted', () => {
    render(<TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} />);
    expect(screen.queryAllByTestId('network-marker')).toHaveLength(0);
  });

  it('renders one marker per network failure', () => {
    render(<TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} networkFailures={[FAILURES[0]]} />);
    expect(screen.getAllByTestId('network-marker')).toHaveLength(1);
  });

  it('renders multiple network markers', () => {
    render(<TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} networkFailures={FAILURES} />);
    expect(screen.getAllByTestId('network-marker')).toHaveLength(2);
  });

  it('marker tooltip includes method, url and status', () => {
    render(<TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()} networkFailures={[FAILURES[0]]} />);
    const marker = screen.getByTestId('network-marker');
    expect(marker.getAttribute('title')).toContain('POST');
    expect(marker.getAttribute('title')).toContain('/api/payment');
    expect(marker.getAttribute('title')).toContain('503');
  });

  it('marker is positioned at correct left percentage', () => {
    render(<TimelineBar events={EVENTS} durationMs={10000} currentTimeMs={0} onSeek={jest.fn()} networkFailures={[FAILURES[0]]} />);
    const marker = screen.getByTestId('network-marker');
    // 4000 / 10000 = 40%
    expect(marker).toHaveStyle({ left: '40%' });
  });

  it('network markers coexist with rage and freeze markers', () => {
    render(
      <TimelineBar events={EVENTS} durationMs={DURATION} currentTimeMs={0} onSeek={jest.fn()}
        rageTimestamps={[2000]}
        freezeTimestamps={[5000]}
        networkFailures={[FAILURES[0]]} />
    );
    expect(screen.getAllByTestId('network-marker')).toHaveLength(1);
    expect(screen.getAllByTestId('rage-marker')).toHaveLength(1);
    expect(screen.getAllByTestId('freeze-marker')).toHaveLength(1);
  });
});
