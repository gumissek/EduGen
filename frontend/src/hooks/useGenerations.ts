'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { GenerationParams } from '@/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { GENERATION_POLL_INTERVAL_MS } from '@/lib/constants';

interface GenerationStatus {
  id: string;
  status: 'draft' | 'processing' | 'ready' | 'error';
  error_message?: string;
  created_at: string;
}

export function useGenerations(id?: string) {
  const router = useRouter();
  const { error } = useSnackbar();

  // Polling check for generation status
  const query = useQuery({
    queryKey: ['generation', id],
    queryFn: async () => {
      const res = await api.get<GenerationStatus>(`/api/generations/${id}`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: (queryData: any) => {
      const status = queryData.state?.data?.status;
      if (status === 'processing' || status === 'draft') return GENERATION_POLL_INTERVAL_MS;
      return false; // stop polling
    },
  });

  const createMutation = useMutation({
    mutationFn: async (params: GenerationParams) => {
      const res = await api.post<{ id: string }>('/api/generations', params);
      return res.data;
    },
    onSuccess: (data: { id: string }) => {
      router.push(`/generate/${data.id}/status`);
    },
    onError: () => {
      error('Błąd podczas inicjowania generowania.');
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (generationId: string) => {
      const res = await api.post(`/api/generations/${generationId}/finalize`);
      return res.data;
    },
    onError: () => {
      error('Błąd podczas finalizacji dokumentu.');
    },
  });

  return {
    generationStatus: query.data,
    isLoadingStatus: query.isLoading,
    isErrorStatus: query.isError,
    createGeneration: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    finalizeGeneration: finalizeMutation.mutateAsync,
    isFinalizing: finalizeMutation.isPending,
  };
}
