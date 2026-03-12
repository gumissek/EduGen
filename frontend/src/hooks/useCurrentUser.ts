'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface CurrentUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  api_quota: number;
  api_quota_reset: string | null;
  has_secret_keys: boolean;
}

export function useCurrentUser() {
  const query = useQuery({
    queryKey: ['user-me'],
    queryFn: async () => {
      const res = await api.get<CurrentUser>('/api/auth/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
