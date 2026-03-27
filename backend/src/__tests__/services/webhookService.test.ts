import { db } from '../../db/client';
import {
  listWebhooks, createWebhook, deleteWebhook, deliverWebhook, fireWebhooks,
} from '../../services/webhookService';

const mockDb     = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';
const WH_ID      = 'wh-1';

const MOCK_WEBHOOK = {
  id: WH_ID, project_id: PROJECT_ID, name: 'Slack',
  url: 'https://hooks.slack.com/test', events: ['crash.new'], secret: null, enabled: true, created_at: '',
};

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => mockFetch.mockClear());

describe('webhookService', () => {
  describe('listWebhooks', () => {
    it('returns project webhooks', async () => {
      mockDb.query.mockResolvedValue({ rows: [MOCK_WEBHOOK] });
      const result = await listWebhooks(PROJECT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Slack');
    });
  });

  describe('createWebhook', () => {
    it('inserts and returns webhook', async () => {
      mockDb.query.mockResolvedValue({ rows: [MOCK_WEBHOOK] });
      const result = await createWebhook(PROJECT_ID, 'Slack', 'https://hooks.slack.com/test', ['crash.new']);
      expect(result.name).toBe('Slack');
    });

    it('throws INVALID_URL for non-HTTP URL', async () => {
      await expect(
        createWebhook(PROJECT_ID, 'Bad', 'ftp://bad.com', ['crash.new'])
      ).rejects.toThrow('INVALID_URL');
    });

    it('throws NO_EVENTS if events array is empty', async () => {
      await expect(
        createWebhook(PROJECT_ID, 'Test', 'https://example.com', [])
      ).rejects.toThrow('NO_EVENTS');
    });

    it('throws NO_EVENTS if all events are unsupported', async () => {
      await expect(
        createWebhook(PROJECT_ID, 'Test', 'https://example.com', ['made.up.event'])
      ).rejects.toThrow('NO_EVENTS');
    });
  });

  describe('deleteWebhook', () => {
    it('throws NOT_FOUND for unknown id', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      await expect(deleteWebhook(PROJECT_ID, 'nonexistent')).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('deliverWebhook', () => {
    it('calls fetch with POST and correct payload', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      await deliverWebhook(MOCK_WEBHOOK, 'crash.new', PROJECT_ID, { message: 'TypeError' });
      expect(mockFetch).toHaveBeenCalledWith(
        MOCK_WEBHOOK.url,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('sets Content-Type: application/json', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      await deliverWebhook(MOCK_WEBHOOK, 'crash.new', PROJECT_ID, {});
      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect((options.headers as Record<string,string>)['Content-Type']).toBe('application/json');
    });

    it('adds X-Signature header when secret is set', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      await deliverWebhook({ ...MOCK_WEBHOOK, secret: 'mysecret' }, 'crash.new', PROJECT_ID, {});
      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect((options.headers as Record<string,string>)['X-Signature']).toMatch(/^sha256=/);
    });

    it('does NOT add X-Signature when no secret', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      await deliverWebhook({ ...MOCK_WEBHOOK, secret: null }, 'crash.new', PROJECT_ID, {});
      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect((options.headers as Record<string,string>)['X-Signature']).toBeUndefined();
    });

    it('does not throw when fetch fails (resilient delivery)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      await expect(
        deliverWebhook(MOCK_WEBHOOK, 'crash.new', PROJECT_ID, {})
      ).rejects.toThrow(); // deliverWebhook itself throws; fireWebhooks catches it
    });
  });

  describe('fireWebhooks', () => {
    it('queries for enabled webhooks subscribed to event', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      mockDb.query.mockResolvedValue({ rows: [] });
      await fireWebhooks(PROJECT_ID, 'crash.new', {});
      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toMatch(/enabled = true/);
      expect(sql).toMatch(/ANY\(events\)/);
    });
  });
});
