'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export interface UserAIModel {
  id: string;
  user_id: string;
  provider: string;
  model_name: string;
  description: string | null;
  price_description: string | null;
  is_available: boolean;
  created_at: string;
  changed_at: string | null;
  request_made: number;
}

export interface UserAIModelCreate {
  provider: string;
  model_name: string;
  description?: string;
  price_description?: string;
}

export function useUserAIModels() {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();

  const query = useQuery({
    queryKey: ['user-ai-models'],
    queryFn: async () => {
      const res = await api.get<UserAIModel[]>('/api/user-ai-models');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserAIModelCreate) => {
      const res = await api.post<UserAIModel>('/api/user-ai-models', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-ai-models'] });
      success('Model AI został dodany');
    },
    onError: (err: { response?: { status?: number; data?: { detail?: string } } }) => {
      if (err?.response?.status === 409) {
        error(err.response.data?.detail ?? 'Ten model już istnieje na Twojej liście.');
      } else {
        error('Nie udało się dodać modelu AI.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (modelId: string) => {
      await api.delete(`/api/user-ai-models/${modelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-ai-models'] });
      success('Model AI został usunięty');
    },
    onError: () => {
      error('Nie udało się usunąć modelu.');
    },
  });

  return {
    models: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createModel: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteModel: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
