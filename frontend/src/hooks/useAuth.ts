'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { LoginRequest, LoginResponse, RegisterRequest } from '@/schemas/auth';

const AUTH_COOKIE = 'edugen-auth';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = (): boolean => {
    return !!Cookies.get(AUTH_COOKIE);
  };

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', data);
      // The backend sets the cookie via Set-Cookie header, but also store it client-side
      Cookies.set(AUTH_COOKIE, response.data.access_token, {
        expires: 7, // 7 days
        sameSite: 'lax',
      });
      queryClient.clear();
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { detail?: string })?.detail || 'Nieprawidłowy adres e-mail lub hasło'
          : 'Nieprawidłowy adres e-mail lub hasło';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/api/auth/register', {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      // Auto-login after registration
      await login({ email: data.email, password: data.password });
    } catch (err: unknown) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { detail?: string })?.detail || 'Rejestracja nie powiodła się'
          : 'Rejestracja nie powiodła się';
      setError(message);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore errors — still clear local state
    }
    Cookies.remove(AUTH_COOKIE);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('edugen-generation-step');
      window.localStorage.removeItem('edugen-generation-draft');
    }
    queryClient.clear();
    router.push('/login');
  };

  return {
    login,
    register,
    logout,
    isAuthenticated,
    isLoading,
    error,
  };
}
