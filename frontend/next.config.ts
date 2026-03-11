import type { NextConfig } from 'next';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function readVersionInfo(): { appName: string; version: string; releaseDate: string } {
  // .version lives in the repo root.
  // Locally: __dirname = <repo>/frontend, so '../.version' resolves to the root file.
  // Docker:  __dirname = /app (WORKDIR), '../.version' = '/.version' (not found),
  //          falls through to '.version' which is COPY-ed to /app/.version.
  const candidates = [
    resolve(__dirname, '..', '.version'), // root — works in local dev
    resolve(__dirname, '.version'),       // /app/.version — works in Docker
  ];
  try {
    let content: string | undefined;
    for (const p of candidates) {
      try { content = readFileSync(p, 'utf-8'); break; } catch { /* try next */ }
    }
    if (!content) throw new Error('not found');
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
    return { appName: 'EduGen', version: '1.0.1', releaseDate: '2026-03-11' };
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
