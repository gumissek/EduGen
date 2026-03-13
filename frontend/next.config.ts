import type { NextConfig } from 'next';
import os from 'os';

// Version info is read from environment variables.
// Locally: set in frontend/.env.local
// Docker:  passed as build args in docker-compose.yml → Dockerfile (ARG/ENV)
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'EduGen';
const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
const releaseDate = process.env.NEXT_PUBLIC_APP_RELEASE_DATE ?? '';


function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return ips;
}

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', 'localhost' , ...getLocalIPs() ],
  transpilePackages: ['@mui/material', '@mui/system', '@mui/icons-material'],
  env: {
    NEXT_PUBLIC_APP_NAME: appName,
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_RELEASE_DATE: releaseDate,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
