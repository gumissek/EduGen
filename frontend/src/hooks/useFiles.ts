'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { SourceFile } from '@/types';

interface FileListResponse {
  files: SourceFile[];
  total: number;
}
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export function useFiles(subjectId?: string | null) {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();

  const query = useQuery({
    queryKey: ['files', subjectId],
    queryFn: async () => {
      const res = await api.get<FileListResponse>(`/api/files?subject_id=${subjectId}`);
      return res.data.files;
    },
    enabled: !!subjectId,
    // Poll every 5s if any file is still being processed (no text and no error yet)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    refetchInterval: (queryData: any) => {
      const hasProcessingFiles = queryData.state?.data?.some(
        (f: SourceFile) => !f.has_extracted_text && !f.extraction_error,
      );
      return hasProcessingFiles ? 5000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ formData, onProgress }: { formData: FormData; onProgress?: (p: number) => void }) => {
      const res = await api.post<SourceFile>('/api/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', subjectId] });
      success('Plik przesłany pomyślnie');
    },
    onError: () => {
      error('Błąd podczas przesyłania pliku');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await api.delete(`/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', subjectId] });
      success('Plik został usunięty');
    },
    onError: () => {
      error('Nie udało się usunąć pliku');
    },
  });

  return {
    files: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    uploadFile: uploadMutation.mutateAsync,
    deleteFile: deleteMutation.mutateAsync,
  };
}
