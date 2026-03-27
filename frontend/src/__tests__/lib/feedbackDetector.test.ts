import { detectFeedbackEvents } from '@/lib/feedbackDetector';
import { SessionEvent } from '@/types';

function makeEvent(type: string, value: string | null, meta: Record<string, unknown> = {}, elapsed_ms = 5000): SessionEvent {
  return { id: elapsed_ms, type, elapsed_ms, timestamp: '', x: null, y: null, target: null, screen_name: null, value, metadata: meta };
}

describe('detectFeedbackEvents', () => {
  it('returns empty array for empty events', () => {
    expect(detectFeedbackEvents([])).toEqual([]);
  });

  it('returns empty when no feedback events', () => {
    expect(detectFeedbackEvents([makeEvent('click', null), makeEvent('scroll', null)])).toEqual([]);
  });

  it('returns feedback events where value = __feedback__', () => {
    const events = [makeEvent('custom', '__feedback__', { message: 'Hello', feedback: true }, 5000)];
    const result = detectFeedbackEvents(events);
    expect(result).toHaveLength(1);
  });

  it('extracts message from metadata', () => {
    const events = [makeEvent('custom', '__feedback__', { message: 'Great app!', feedback: true })];
    expect(detectFeedbackEvents(events)[0].message).toBe('Great app!');
  });

  it('extracts rating from metadata', () => {
    const events = [makeEvent('custom', '__feedback__', { message: 'Nice', rating: 4, feedback: true })];
    expect(detectFeedbackEvents(events)[0].rating).toBe(4);
  });

  it('ignores other custom events', () => {
    const events = [
      makeEvent('custom', 'button_click', {}, 1000),
      makeEvent('custom', '__feedback__', { message: 'Hi', feedback: true }, 5000),
    ];
    expect(detectFeedbackEvents(events)).toHaveLength(1);
    expect(detectFeedbackEvents(events)[0].elapsed_ms).toBe(5000);
  });

  it('returns elapsed_ms for timeline positioning', () => {
    const events = [makeEvent('custom', '__feedback__', { message: 'Hi' }, 8500)];
    expect(detectFeedbackEvents(events)[0].elapsed_ms).toBe(8500);
  });
});
