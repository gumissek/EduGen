'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, mustChangePassword } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only check auth state if we're not on the login page
    if (pathname === '/login') {
      setTimeout(() => setIsChecking(false), 0);
      return;
    }

    const checkAuth = async () => {
      const authed = isAuthenticated();
      if (!authed) {
        // Use replace so the protected route is removed from history
        router.replace('/login');
        return;
      }
      // Enforce password change before accessing any other page
      if (mustChangePassword() && pathname !== '/change-password') {
        router.replace('/change-password');
        return;
      }
      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, mustChangePassword, pathname, router]);

  if (isChecking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}
