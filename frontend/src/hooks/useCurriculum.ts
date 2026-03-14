'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { CurriculumDocument } from '@/types';

interface CurriculumDocumentsResponse {
  documents: CurriculumDocument[];
  total: number;
}

export function useCurriculum(filters?: { education_level?: string; subject_name?: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<CurriculumDocumentsResponse>({
    queryKey: ['curriculum-documents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.education_level) params.set('education_level', filters.education_level);
      if (filters?.subject_name) params.set('subject_name', filters.subject_name);
      const res = await api.get(`/api/curriculum/documents?${params.toString()}`);
      return res.data;
    },
    refetchInterval: (query) => {
      // Auto-refetch when documents are processing
      const docs = query.state.data?.documents ?? [];
      const hasProcessing = docs.some((d: CurriculumDocument) => d.status === 'processing' || d.status === 'uploaded');
      return hasProcessing ? 5000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/api/curriculum/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      });
      return res.data as CurriculumDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-documents'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await api.delete(`/api/curriculum/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-documents'] });
    },
  });

  return {
    documents: data?.documents ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    uploadDocument: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    deleteDocument: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useCurriculumCompliance(generationId: string) {
  const queryClient = useQueryClient();

  const complianceMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/curriculum/compliance/${generationId}`, {}, { timeout: 120_000 });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototype'] });
    },
  });

  return {
    runCompliance: complianceMutation.mutateAsync,
    complianceData: complianceMutation.data,
    isLoading: complianceMutation.isPending,
    error: complianceMutation.error,
  };
}
