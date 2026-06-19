import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import ingestRouter from './routes/ingest';
import sessionsRouter from './routes/sessions';
import eventsRouter from './routes/events';
import usersRouter from './routes/users';
import analyticsRouter from './routes/analytics';
import funnelsRouter from './routes/funnels';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import segmentsRouter from './routes/segments';
import teamRouter from './routes/team';
import invitesRouter from './routes/invites';
import bookmarksRouter from './routes/bookmarks';
import webhooksRouter from './routes/webhooks';
import reportsRouter from './routes/reports';

const app = express();

app.use(cors());
// 4mb accommodates the largest replay payloads: DOM snapshots (capped at 2MB in
// domSnapshotService) and base64 screenshots (capped at 1MB in screenFrameService),
// plus the JSON envelope. Smaller endpoints are unaffected by the higher ceiling.
app.use(express.json({ limit: '4mb' }));

// Request logger showing method, URL, and status code
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.get('/health', (_req: express.Request, res: express.Response) => res.json({ status: 'ok' }));

// ── Public SDK loader ──────────────────────────────────────────────────────────
// Serves the browser SDK bundle so customers can embed
//   <script src="https://your-api-host/sdk.js"></script>
// The bundle is rebuilt from source on every Docker image build (see
// backend/Dockerfile, sdk-build stage), so it can never go stale the way a
// hand-built sdk/dist/ can — that staleness was what made replays show clicks
// only, with no screen.
const SDK_BUNDLE_CANDIDATES = [
  process.env.SDK_BUNDLE_PATH,                                 // explicit override
  '/sdk/uxclone-sdk.js',                                       // baked into the Docker image
  path.resolve(__dirname, '../../sdk/dist/uxclone-sdk.js'),    // local dev (repo checkout)
].filter((p): p is string => Boolean(p));

function resolveSdkBundle(): string | null {
  for (const p of SDK_BUNDLE_CANDIDATES) {
    try { if (fs.existsSync(p)) return p; } catch { /* ignore */ }
  }
  return null;
}

app.get('/sdk.js', (_req: express.Request, res: express.Response) => {
  const bundle = resolveSdkBundle();
  res.type('application/javascript');
  if (!bundle) {
    res.status(503).send('// UXClone SDK bundle not found. Rebuild the image (docker compose build api) or run `npm run bundle` in sdk/.');
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(bundle);
});

app.use('/api/v1/ingest', ingestRouter);
app.use('/api/v1/sessions/:sessionId/events', eventsRouter);
app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/funnels', funnelsRouter);
app.use('/api/v1/auth',     authRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/segments', segmentsRouter);
app.use('/api/v1/projects/:id', teamRouter);
app.use('/api/v1/invites',      invitesRouter);
app.use('/api/v1/bookmarks',    bookmarksRouter);
app.use('/api/v1/webhooks',     webhooksRouter);
app.use('/api/v1/reports',      reportsRouter);

export default app;
