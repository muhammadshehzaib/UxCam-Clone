import express from 'express';
import cors from 'cors';
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
app.use(express.json({ limit: '1mb' }));

// Simple request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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
