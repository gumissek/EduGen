'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Cookies from 'js-cookie';
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
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const normalizedPathname = pathname ?? '';
  const isAuthenticatedRoute = AUTHENTICATED_PREFIXES.some((prefix) => normalizedPathname.startsWith(prefix));
  const isStateDocumentsRoute = normalizedPathname.startsWith('/state-documents/pp');
  const hasAuthCookie = isMounted ? Boolean(Cookies.get('edugen-auth')) : false;
  const isAuthenticatedStateDocumentsRoute = isStateDocumentsRoute && hasAuthCookie;
  const showPublicChrome = !isAuthenticatedRoute && !isAuthenticatedStateDocumentsRoute;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {showPublicChrome && <PublicTopBar />}
      <Toolbar hidden={!showPublicChrome} sx={{ minHeight: { xs: 64, sm: 70 } }} />
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
      {showPublicChrome && <AppFooter compact />}
    </Box>
  );
}
