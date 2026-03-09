'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { SettingsResponse, SettingsUpdate, ValidateKeyResponse } from '@/schemas/settings';
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

  const validateKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ValidateKeyResponse>('/api/settings/validate-key');
      return res.data;
    },
    onSuccess: (data: ValidateKeyResponse) => {
      if (data.valid) {
        success('Klucz API jest prawidłowy');
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      } else {
        error('Klucz API jest nieprawidłowy');
      }
    },
    onError: () => {
      error('Błąd podczas weryfikacji klucza API');
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    validateKey: validateKeyMutation.mutateAsync,
    isValidating: validateKeyMutation.isPending,
  };
}
