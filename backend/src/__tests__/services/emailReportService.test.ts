import { db } from '../../db/client';
import {
  listReports, createReport, deleteReport, buildReportData, triggerDueReports,
} from '../../services/emailReportService';

jest.mock('../../services/analyticsService', () => ({
  getSummary: jest.fn().mockResolvedValue({ totalSessions: 100, totalUsers: 50, avgSessionDurationMs: 60000, topEvents: [], topScreens: [] }),
}));
jest.mock('../../services/crashService', () => ({
  getCrashGroups: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../services/retentionService', () => ({
  getRetention: jest.fn().mockResolvedValue({ summary: { d1_pct: 40, d7_pct: 25, d30_pct: 12, total_users: 100 }, cohorts: [] }),
}));
jest.mock('../../lib/mailer', () => ({ sendMail: jest.fn().mockResolvedValue(undefined) }));

const mockDb = db as unknown as { query: jest.Mock };
const PROJECT_ID = 'proj-1';
const REPORT_ID  = 'rep-1';
const MOCK_REPORT = { id: REPORT_ID, project_id: PROJECT_ID, email: 'a@b.com', frequency: 'weekly', enabled: true, last_sent_at: null, created_at: '' };

describe('emailReportService', () => {
  describe('createReport', () => {
    it('inserts and returns report', async () => {
      mockDb.query.mockResolvedValue({ rows: [MOCK_REPORT] });
      const result = await createReport(PROJECT_ID, 'a@b.com');
      expect(result.email).toBe('a@b.com');
    });

    it('throws INVALID_EMAIL for bad email', async () => {
      await expect(createReport(PROJECT_ID, 'not-email')).rejects.toThrow('INVALID_EMAIL');
    });
  });

  describe('deleteReport', () => {
    it('throws NOT_FOUND for unknown id', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      await expect(deleteReport(PROJECT_ID, 'nonexistent')).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('buildReportData', () => {
    it('returns summary, crashes, and retention', async () => {
      const result = await buildReportData(PROJECT_ID);
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('crashes');
      expect(result).toHaveProperty('retention');
    });
  });

  describe('triggerDueReports', () => {
    it('skips disabled subscriptions (query filters by enabled = true)', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      const result = await triggerDueReports();
      expect(result.sent).toBe(0);
      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toMatch(/enabled = true/);
    });

    it('skips reports sent within the last 7 days', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      await triggerDueReports();
      const sql = mockDb.query.mock.calls[0][0] as string;
      expect(sql).toMatch(/6 days 23 hours/);
    });

    it('returns sent count', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ ...MOCK_REPORT, project_name: 'My App' }] })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE last_sent_at
      const result = await triggerDueReports();
      expect(result.sent).toBe(1);
    });
  });
});
