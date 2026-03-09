'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Document } from '@/schemas/document';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  per_page: number;
}

export function useDocuments(subjectId?: string) {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();

  const query = useQuery({
    queryKey: ['documents', subjectId],
    queryFn: async () => {
      const url = subjectId ? `/api/documents?subject_id=${subjectId}` : '/api/documents';
      const res = await api.get<DocumentListResponse>(url);
      return res.data.documents;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      success('Dokument został usunięty');
    },
    onError: () => {
      error('Błąd podczas usuwania dokumentu');
    },
  });

  return {
    documents: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    deleteDocument: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useDocumentDetails(id: string) {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();

  const query = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const res = await api.get<Document>(`/api/documents/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.put<Document>(`/api/documents/${id}`, { content });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      success('Dokument zaktualizowany');
    },
    onError: () => {
      error('Nie udało się zaktualizować dokumentu');
    },
  });

  const generatePDFMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/api/documents/${id}/export/pdf`, { responseType: 'blob' });
      return res.data;
    },
    onSuccess: (blob: Blob) => {
      // Create object URL and download
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${query.data?.title || 'dokument'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      success('Pobieranie rozpoczęte');
    },
    onError: () => {
      error('Błąd podczas generowania PDF');
    },
  });

  const generateWordMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/api/documents/${id}/export/docx`, { responseType: 'blob' });
      return res.data;
    },
    onSuccess: (blob: Blob) => {
      // Create object URL and download
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${query.data?.title || 'dokument'}.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      success('Pobieranie rozpoczęte');
    },
    onError: () => {
      error('Błąd podczas generowania DOCX');
    },
  });

  return {
    document: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateDocument: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    exportPDF: generatePDFMutation.mutate,
    isExportingPDF: generatePDFMutation.isPending,
    exportWord: generateWordMutation.mutate,
    isExportingWord: generateWordMutation.isPending,
  };
}
