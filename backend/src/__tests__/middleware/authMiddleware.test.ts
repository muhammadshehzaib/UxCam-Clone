import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db/client';
import { requireDashboardToken, ProjectRequest } from '../../middleware/auth';
import { config } from '../../config';

const mockDb = db as unknown as { query: jest.Mock };

const PROJECT_ID = 'proj-uuid';
const USER_ID    = 'user-uuid';

const MOCK_PROJECT = { id: PROJECT_ID, name: 'Test Project', api_key: 'test_key' };

function makeReqRes() {
  const req  = { headers: {} } as ProjectRequest;
  const res  = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

function makeJwt(payload = { sub: USER_ID, projectId: PROJECT_ID, email: 'a@b.com' }): string {
  return jwt.sign(payload, config.dashboardJwtSecret, { expiresIn: '1h' });
}

describe('requireDashboardToken', () => {
  it('returns 401 when no token provided', async () => {
    const { req, res, next } = makeReqRes();
    await requireDashboardToken(req, res, next);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts static DASHBOARD_TOKEN env var (backward compat)', async () => {
    const { req, res, next } = makeReqRes();
    req.headers.authorization = `Bearer ${config.dashboardToken}`;
    await requireDashboardToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as ProjectRequest).project?.id).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('accepts a valid JWT and loads project from DB', async () => {
    const { req, res, next } = makeReqRes();
    req.headers.authorization = `Bearer ${makeJwt()}`;
    mockDb.query.mockResolvedValue({ rows: [MOCK_PROJECT] });

    await requireDashboardToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as ProjectRequest).project?.id).toBe(PROJECT_ID);
    expect((req as ProjectRequest).project?.name).toBe('Test Project');
  });

  it('returns 401 for expired JWT', async () => {
    const { req, res, next } = makeReqRes();
    const expired = jwt.sign(
      { sub: USER_ID, projectId: PROJECT_ID, email: 'a@b.com' },
      config.dashboardJwtSecret,
      { expiresIn: -1 } // already expired
    );
    req.headers.authorization = `Bearer ${expired}`;

    await requireDashboardToken(req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for tampered JWT (wrong secret)', async () => {
    const { req, res, next } = makeReqRes();
    const tampered = jwt.sign({ sub: USER_ID, projectId: PROJECT_ID, email: 'a@b.com' }, 'wrong-secret');
    req.headers.authorization = `Bearer ${tampered}`;

    await requireDashboardToken(req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when JWT projectId has no matching project in DB', async () => {
    const { req, res, next } = makeReqRes();
    req.headers.authorization = `Bearer ${makeJwt()}`;
    mockDb.query.mockResolvedValue({ rows: [] }); // project not found

    await requireDashboardToken(req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('also reads token from x-dashboard-token header', async () => {
    const { req, res, next } = makeReqRes();
    (req.headers as Record<string, string>)['x-dashboard-token'] = config.dashboardToken;

    await requireDashboardToken(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
