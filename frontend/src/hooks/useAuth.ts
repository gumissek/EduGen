'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LoginRequest } from '@/schemas/auth';
import { useQueryClient } from '@tanstack/react-query';

const MUST_CHANGE_PASSWORD_KEY = 'edugen-must-change-password';
const AUTH_COOKIE = 'edugen-auth';

/** Store the JWT token in a readable cookie (accessible to Next.js middleware). */
function setAuthCookie(token: string) {
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; path=/; SameSite=Strict; max-age=${60 * 60 * 24 * 7}`;
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=; path=/; SameSite=Strict; max-age=0`;
}

/** Read the JWT token from the auth cookie. */
export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${AUTH_COOKIE}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split('=').slice(1).join('=')) || null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/auth/login', data);
      const { token, must_change_password } = response.data;
      // Store the actual JWT token in the cookie (readable by Next.js middleware)
      setAuthCookie(token);
      if (must_change_password) {
        localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, '1');
        router.push('/change-password');
      } else {
        localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
        router.push('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Nieprawidłowe hasło');
      } else {
        setError('Nie można połączyć z serwerem');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (newPassword: string): Promise<void> => {
    await api.post('/api/auth/change-password', { new_password: newPassword });
    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    // cookie is already set, no need to reset
  };

  const mustChangePassword = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === '1';
  };

  const logout = () => {
    clearAuthCookie();
    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    queryClient.clear();
    // Invalidate the server-side session token via the logout endpoint
    api.post('/api/auth/logout').catch(() => {});
    router.replace('/login');
  };

  const isAuthenticated = () => {
    if (typeof window === 'undefined') return false;
    return !!getTokenFromCookie();
  };

  return {
    login,
    logout,
    changePassword,
    mustChangePassword,
    isAuthenticated,
    isLoading,
    error,
  };
}
