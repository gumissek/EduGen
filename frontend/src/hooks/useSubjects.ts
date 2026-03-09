'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Subject } from '@/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { CreateSubjectRequest } from '@/schemas/subject';

export function useSubjects() {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();

  const query = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get<Subject[]>('/api/subjects');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateSubjectRequest) => {
      const res = await api.post<Subject>('/api/subjects', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      success('Przedmiot został dodany');
    },
    onError: () => {
      error('Nie udało się dodać przedmiotu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      success('Przedmiot został usunięty');
    },
    onError: () => {
      error('Nie udało się usunąć przedmiotu');
    },
  });

  return {
    subjects: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    createSubject: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteSubject: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
