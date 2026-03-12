'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { usePathname } from 'next/navigation';
import PublicTopBar from './PublicTopBar';
import AppFooter from './AppFooter';

const AUTHENTICATED_PREFIXES = [
  '/dashboard',
  '/generate',
  '/subjects',
  '/settings',
  '/documents',
  '/diagnostics',
  '/admin-panel',
];

export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthenticatedRoute = AUTHENTICATED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isAuthenticatedRoute) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <PublicTopBar />
      <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }} />
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
      <AppFooter compact />
    </Box>
  );
}
