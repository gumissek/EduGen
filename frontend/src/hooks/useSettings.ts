'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { SettingsResponse, SettingsUpdate } from '@/schemas/settings';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export function useSettings() {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();

  const query = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get<SettingsResponse>('/api/settings');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsUpdate) => {
      const res = await api.put('/api/settings', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      success('Ustawienia zostały zapisane');
    },
    onError: () => {
      error('Nie udało się zapisać ustawień');
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
