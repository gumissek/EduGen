'use client';

import * as React from 'react';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import SessionTimeoutModal from './SessionTimeoutModal';

export default function IdleTimer() {
  const { showWarning, timeLeft, extendSession, logout } = useIdleTimer();

  return (
    <SessionTimeoutModal
      open={showWarning}
      timeLeft={timeLeft}
      onExtend={extendSession}
      onLogout={logout}
    />
  );
}
