'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface AdminMeResponse {
  detail: string;
}

export function useAdminAccess() {
  const query = useQuery({
    queryKey: ['admin-access'],
    queryFn: async () => {
      const res = await api.get<AdminMeResponse>('/api/admin/me');
      return res.data;
    },
    retry: false,
  });

  return {
    isLoading: query.isLoading,
    isAuthorized: !!query.data,
    isError: query.isError,
  };
}
