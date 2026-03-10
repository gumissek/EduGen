import type { NextConfig } from 'next';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readVersionInfo(): { appName: string; version: string; releaseDate: string } {
  try {
    // .version lives in the frontend/ directory (next to this config file)
    const content = readFileSync(resolve(__dirname, '.version'), 'utf-8');
    const data: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
      const idx = line.indexOf('=');
      if (idx > -1) data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return {
      appName: data['APP_NAME'] ?? 'EduGen',
      version: data['VERSION'] ?? '1.0.0',
      releaseDate: data['RELEASE_DATE'] ?? '',
    };
  } catch {
    return { appName: 'EduGen', version: '1.0.0', releaseDate: '' };
  }
}

const { appName, version, releaseDate } = readVersionInfo();

const nextConfig: NextConfig = {
  output: 'standalone',
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
