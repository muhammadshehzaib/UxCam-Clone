import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { config } from './config';
import ingestRouter from './routes/ingest';
import sessionsRouter from './routes/sessions';
import eventsRouter from './routes/events';
import usersRouter from './routes/users';
import analyticsRouter from './routes/analytics';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/v1/ingest', ingestRouter);
app.use('/api/v1/sessions/:sessionId/events', eventsRouter);
app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/analytics', analyticsRouter);

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});

export default app;
