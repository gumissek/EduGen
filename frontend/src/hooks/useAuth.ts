'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LoginRequest } from '@/schemas/auth';
import { useQueryClient } from '@tanstack/react-query';

const MUST_CHANGE_PASSWORD_KEY = 'edugen-must-change-password';

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
      localStorage.setItem('edugen-token', token);
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
  };

  const mustChangePassword = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === '1';
  };

  const logout = () => {
    localStorage.removeItem('edugen-token');
    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    queryClient.clear();
    router.push('/login');
  };

  const isAuthenticated = () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('edugen-token');
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
