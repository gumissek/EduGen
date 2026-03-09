'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LoginRequest } from '@/schemas/auth';
import { useQueryClient } from '@tanstack/react-query';

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
      const { token } = response.data;
      localStorage.setItem('edugen-token', token);
      router.push('/dashboard');
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

  const logout = () => {
    localStorage.removeItem('edugen-token');
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
    isAuthenticated,
    isLoading,
    error,
  };
}
