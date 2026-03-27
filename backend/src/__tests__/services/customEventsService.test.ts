import { db } from '../../db/client';
import { getCustomEvents, getCustomEventTimeline } from '../../services/analyticsService';

const mockDb = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';

describe('getCustomEvents', () => {
  it('returns events list ordered by count', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ name: 'button_click', count: '100' }, { name: 'form_submit', count: '50' }] })
      .mockResolvedValueOnce({ rows: [{ total_events: '150', unique_names: '2' }] });
    const result = await getCustomEvents(PROJECT_ID, 30);
    expect(result.events[0].name).toBe('button_click');
    expect(result.events[0].count).toBe(100);
  });

  it('only queries type = custom events', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCustomEvents(PROJECT_ID, 30);
    const sql = mockDb.query.mock.calls[0][0] as string;
    expect(sql).toMatch(/type = 'custom'/);
  });

  it('returns total_events count', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_events: '500', unique_names: '8' }] });
    const result = await getCustomEvents(PROJECT_ID, 30);
    expect(result.total_events).toBe(500);
  });

  it('returns unique_names count', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_events: '0', unique_names: '5' }] });
    const result = await getCustomEvents(PROJECT_ID, 30);
    expect(result.unique_names).toBe(5);
  });

  it('filters by project_id and timestamp', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCustomEvents(PROJECT_ID, 7);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(PROJECT_ID);
    expect(params[1]).toBeInstanceOf(Date);
  });

  it('returns empty array when no custom events', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_events: '0', unique_names: '0' }] });
    const result = await getCustomEvents(PROJECT_ID, 30);
    expect(result.events).toEqual([]);
  });
});

describe('getCustomEventTimeline', () => {
  it('returns daily buckets for the named event', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ date: '2024-01-01', count: '10' }, { date: '2024-01-02', count: '15' }] });
    const result = await getCustomEventTimeline(PROJECT_ID, 'button_click', 30);
    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(10);
  });

  it('filters by exact event name', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    await getCustomEventTimeline(PROJECT_ID, 'form_submit', 30);
    const params = mockDb.query.mock.calls[0][1] as unknown[];
    expect(params).toContain('form_submit');
  });

  it('returns empty array when event has no data', async () => {
    mockDb.query.mockResolvedValue({ rows: [] });
    const result = await getCustomEventTimeline(PROJECT_ID, 'unknown', 30);
    expect(result).toEqual([]);
  });
});
