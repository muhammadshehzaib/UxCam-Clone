import 'dotenv/config';

export const config = {
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://uxclone:uxclone@localhost:5432/uxclone',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  dashboardJwtSecret: process.env.DASHBOARD_JWT_SECRET ?? 'dev-secret',
  dashboardToken: process.env.DASHBOARD_TOKEN ?? 'dev-dashboard-token',
  isDev: process.env.NODE_ENV !== 'production',
};
