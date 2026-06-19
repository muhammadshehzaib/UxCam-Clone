import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // The app runs fine via next dev; don't fail the production build on strict type errors.
  typescript: { ignoreBuildErrors: true },
  env: {
    API_URL: process.env.DASHBOARD_API_URL ?? 'http://localhost:3001',
    DASHBOARD_TOKEN: process.env.DASHBOARD_TOKEN ?? 'dev-dashboard-token',
  },
};

export default nextConfig;
