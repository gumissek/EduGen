'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SecretKey, SecretKeyCreate, SecretKeyValidateResponse } from '@/schemas/settings';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export function useSecretKeys() {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();

  const query = useQuery({
    queryKey: ['secret-keys'],
    queryFn: async () => {
      const res = await api.get<SecretKey[]>('/api/secret-keys');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SecretKeyCreate) => {
      const res = await api.post<SecretKey>('/api/secret-keys', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secret-keys'] });
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
      success('Klucz API został dodany');
    },
    onError: () => {
      error('Nie udało się dodać klucza API');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await api.delete(`/api/secret-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secret-keys'] });
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
      success('Klucz API został usunięty');
    },
    onError: () => {
      error('Nie udało się usunąć klucza API');
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await api.post<SecretKeyValidateResponse>(`/api/secret-keys/${keyId}/validate`);
      return res.data;
    },
    onSuccess: (data: SecretKeyValidateResponse) => {
      if (data.valid) {
        success('Klucz API jest prawidłowy');
      } else {
        error(`Klucz API jest nieprawidłowy: ${data.error || 'Nieznany błąd'}`);
      }
    },
    onError: () => {
      error('Błąd podczas weryfikacji klucza API');
    },
  });

  return {
    secretKeys: query.data || [],
    isLoading: query.isLoading,
    createKey: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteKey: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    validateKey: validateMutation.mutateAsync,
    isValidating: validateMutation.isPending,
  };
}
