import 'dotenv/config';

export const config = {
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://uxclone:uxclone@localhost:5432/uxclone',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  dashboardJwtSecret: process.env.DASHBOARD_JWT_SECRET ?? 'dev-secret',
  dashboardToken: process.env.DASHBOARD_TOKEN ?? 'dev-dashboard-token',
  isDev:      process.env.NODE_ENV !== 'production',
  cronSecret: process.env.CRON_SECRET ?? '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey:    process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
};

/** True when all three Cloudinary credentials are present. */
export const cloudinaryEnabled =
  Boolean(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);
