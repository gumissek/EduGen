'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip check on public pages
    if (pathname === '/login' || pathname === '/register') {
      setTimeout(() => setIsChecking(false), 0);
      return;
    }

    const checkAuth = async () => {
      const authed = isAuthenticated();
      if (!authed) {
        router.replace('/login');
        return;
      }
      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, pathname, router]);

  if (isChecking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}
