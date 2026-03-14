'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { SnackbarProvider } from '@/components/ui/SnackbarProvider';
import { logger } from '@/lib/logger';
import React from 'react';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    logger.info('[App] Page loaded / refreshed');
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        {children}
      </SnackbarProvider>
    </QueryClientProvider>
  );
}
