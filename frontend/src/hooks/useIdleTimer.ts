'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from '@/lib/constants';

export function useIdleTimer() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { logout, isAuthenticated } = useAuth();

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated() || showWarning) return;
    
    clearTimers();

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeLeft((SESSION_TIMEOUT_MS - SESSION_WARNING_MS) / 1000); // Usually 60s
      
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearTimers();
            setShowWarning(false);
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    }, SESSION_WARNING_MS);

    idleTimerRef.current = setTimeout(() => {
      setShowWarning(false);
      logout();
    }, SESSION_TIMEOUT_MS);
    
  }, [clearTimers, isAuthenticated, logout, showWarning]);

  const extendSession = useCallback(() => {
    // Calling backend to roll expiration could happen here
    setShowWarning(false);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      clearTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, clearTimers]);

  return { showWarning, timeLeft, extendSession, logout };
}
