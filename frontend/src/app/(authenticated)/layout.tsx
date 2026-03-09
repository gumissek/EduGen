'use client';

import * as React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import IdleTimer from '@/components/auth/IdleTimer';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <IdleTimer />
      <MainLayout>{children}</MainLayout>
    </AuthGuard>
  );
}
