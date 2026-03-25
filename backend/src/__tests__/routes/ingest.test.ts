import request from 'supertest';
import app from '../../app';
import { db } from '../../db/client';
import { redis } from '../../db/redis';

const mockDb = db as unknown as { query: jest.Mock };
const mockRedis = redis as unknown as { get: jest.Mock; set: jest.Mock; hset: jest.Mock; expire: jest.Mock; del: jest.Mock; incr: jest.Mock };

const VALID_API_KEY = 'proj_dev_key';
const PROJECT_ROW = { id: 'proj-uuid', name: 'Dev Project', api_key: VALID_API_KEY };

// Makes requireApiKey middleware pass
function withValidProject() {
  mockDb.query.mockResolvedValueOnce({ rows: [PROJECT_ROW] } as any);
}

describe('POST /api/v1/ingest/session/start', () => {
  it('returns 401 when apiKey is missing', async () => {
    const res = await request(app)
      .post('/api/v1/ingest/session/start')
      .send({ sessionId: 'sess-1', anonymousId: 'anon-1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Missing apiKey/);
  });

  it('returns 401 when apiKey is invalid', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(app)
      .post('/api/v1/ingest/session/start')
      .send({ apiKey: 'bad-key', sessionId: 'sess-1', anonymousId: 'anon-1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid apiKey/);
  });

  it('returns 400 when sessionId is missing', async () => {
    withValidProject();

    const res = await request(app)
      .post('/api/v1/ingest/session/start')
      .send({ apiKey: VALID_API_KEY, anonymousId: 'anon-1' });

    expect(res.status).toBe(400);
  });

  it('returns 201 with sessionId on success', async () => {
    withValidProject();
    mockDb.query.mockResolvedValue({ rows: [] } as any);
    mockRedis.hset.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.incr.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/v1/ingest/session/start')
      .send({
        apiKey: VALID_API_KEY,
        sessionId: 'sess-abc',
        anonymousId: 'anon-abc',
        startedAt: Date.now(),
        device: { type: 'desktop', os: 'macOS', browser: 'Chrome' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionId).toBe('sess-abc');
  });
});

describe('POST /api/v1/ingest/batch', () => {
  it('returns 400 when events array is empty', async () => {
    withValidProject();
    mockRedis.incr.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/v1/ingest/batch')
      .send({ apiKey: VALID_API_KEY, sessionId: 'sess-1', events: [] });

    expect(res.status).toBe(400);
  });

  it('returns 200 with inserted count on success', async () => {
    withValidProject();
    mockRedis.incr.mockResolvedValue(1);
    mockDb.query.mockResolvedValue({ rows: [] } as any);
    mockRedis.del.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/v1/ingest/batch')
      .send({
        apiKey: VALID_API_KEY,
        sessionId: 'sess-1',
        events: [
          { type: 'click', timestamp: Date.now(), elapsedMs: 1000, x: 0.5, y: 0.3 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.inserted).toBe(1);
  });
});

describe('POST /api/v1/ingest/session/end', () => {
  it('returns 400 when sessionId is missing', async () => {
    withValidProject();
    mockRedis.incr.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/v1/ingest/session/end')
      .send({ apiKey: VALID_API_KEY });

    expect(res.status).toBe(400);
  });

  it('returns 200 with durationMs on success', async () => {
    withValidProject();
    mockRedis.incr.mockResolvedValue(1);
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ duration_ms: 45000 }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);
    mockRedis.del.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/v1/ingest/session/end')
      .send({ apiKey: VALID_API_KEY, sessionId: 'sess-1', endedAt: Date.now() });

    expect(res.status).toBe(200);
    expect(res.body.data.durationMs).toBe(45000);
  });
});

describe('POST /api/v1/ingest/identify', () => {
  it('returns 400 when anonymousId is missing', async () => {
    withValidProject();
    mockRedis.incr.mockResolvedValue(1);

    const res = await request(app)
      .post('/api/v1/ingest/identify')
      .send({ apiKey: VALID_API_KEY, userId: 'ext-1' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when user is not found', async () => {
    withValidProject();
    mockRedis.incr.mockResolvedValue(1);
    mockDb.query.mockResolvedValue({ rows: [] } as any);

    const res = await request(app)
      .post('/api/v1/ingest/identify')
      .send({ apiKey: VALID_API_KEY, anonymousId: 'ghost', userId: 'ext-1' });

    expect(res.status).toBe(404);
  });
});
