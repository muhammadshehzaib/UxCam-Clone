import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    API_URL: process.env.DASHBOARD_API_URL ?? 'http://localhost:3001',
    DASHBOARD_TOKEN: process.env.DASHBOARD_TOKEN ?? 'dev-dashboard-token',
  },
};

export default nextConfig;
