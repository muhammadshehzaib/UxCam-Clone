import { detectNetworkFailures } from '@/lib/networkDetector';
import { SessionEvent } from '@/types';

function makeEvent(type: string, elapsed_ms: number, meta: Record<string, unknown> = {}): SessionEvent {
  return {
    id: elapsed_ms, type, elapsed_ms, timestamp: '',
    x: null, y: null, target: null, screen_name: null,
    value: meta.status ? String(meta.status) : null,
    metadata: meta,
  };
}

const NET_META = { url: '/api/payment', method: 'POST', status: 503, duration_ms: 217 };

describe('detectNetworkFailures', () => {
  it('returns empty array for empty events list', () => {
    expect(detectNetworkFailures([])).toEqual([]);
  });

  it('returns empty array when no network events exist', () => {
    const events = [makeEvent('click', 1000), makeEvent('crash', 3000)];
    expect(detectNetworkFailures(events)).toEqual([]);
  });

  it('returns NetworkFailure objects for each network event', () => {
    const events = [makeEvent('network', 5000, NET_META)];
    const result = detectNetworkFailures(events);
    expect(result).toHaveLength(1);
  });

  it('extracts url from metadata', () => {
    const events = [makeEvent('network', 5000, NET_META)];
    expect(detectNetworkFailures(events)[0].url).toBe('/api/payment');
  });

  it('extracts method from metadata', () => {
    const events = [makeEvent('network', 5000, NET_META)];
    expect(detectNetworkFailures(events)[0].method).toBe('POST');
  });

  it('extracts status from metadata', () => {
    const events = [makeEvent('network', 5000, NET_META)];
    expect(detectNetworkFailures(events)[0].status).toBe(503);
  });

  it('ignores non-network event types', () => {
    const events = [
      makeEvent('click',  1000),
      makeEvent('freeze', 2000),
      makeEvent('network', 5000, NET_META),
      makeEvent('crash',  8000),
    ];
    const result = detectNetworkFailures(events);
    expect(result).toHaveLength(1);
    expect(result[0].elapsed_ms).toBe(5000);
  });

  it('returns events ordered by elapsed_ms ascending', () => {
    const events = [
      makeEvent('network', 8000, { ...NET_META, status: 500 }),
      makeEvent('network', 2000, { ...NET_META, status: 404 }),
      makeEvent('network', 5000, { ...NET_META, status: 503 }),
    ];
    const result = detectNetworkFailures(events);
    expect(result.map(r => r.elapsed_ms)).toEqual([2000, 5000, 8000]);
  });
});
