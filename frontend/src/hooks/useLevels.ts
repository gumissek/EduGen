'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EducationLevelItem {
  value: string;
  label: string;
  class_range_start: number;
  class_range_end: number;
}

export interface ClassLevelItem {
  value: string;
  label: string;
  education_level: string;
}

interface CreateEducationLevel {
  value: string;
  label: string;
  class_range_start?: number;
  class_range_end?: number;
}

interface CreateClassLevel {
  value: string;
  label: string;
  education_level: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLevels() {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();

  // ---- Education levels ----
  const eduQuery = useQuery({
    queryKey: ['education-levels'],
    queryFn: async () => {
      const res = await api.get<EducationLevelItem[]>('/api/levels/education');
      return res.data;
    },
  });

  const createEduMutation = useMutation({
    mutationFn: async (data: CreateEducationLevel) => {
      const res = await api.post<EducationLevelItem>('/api/levels/education', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-levels'] });
      success('Poziom edukacji został dodany');
    },
    onError: () => {
      error('Nie udało się dodać poziomu edukacji');
    },
  });

  const deleteEduMutation = useMutation({
    mutationFn: async (value: string) => {
      await api.delete(`/api/levels/education/${encodeURIComponent(value)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-levels'] });
      queryClient.invalidateQueries({ queryKey: ['class-levels'] });
      success('Poziom edukacji został usunięty');
    },
    onError: () => {
      error('Nie udało się usunąć poziomu edukacji');
    },
  });

  // ---- Class levels ----
  const classQuery = useQuery({
    queryKey: ['class-levels'],
    queryFn: async () => {
      const res = await api.get<ClassLevelItem[]>('/api/levels/classes');
      return res.data;
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async (data: CreateClassLevel) => {
      const res = await api.post<ClassLevelItem>('/api/levels/classes', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-levels'] });
      success('Klasa / semestr został dodany');
    },
    onError: () => {
      error('Nie udało się dodać klasy / semestru');
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async ({ educationLevel, value }: { educationLevel: string; value: string }) => {
      await api.delete(`/api/levels/classes/${encodeURIComponent(educationLevel)}/${encodeURIComponent(value)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-levels'] });
      success('Klasa / semestr został usunięty');
    },
    onError: () => {
      error('Nie udało się usunąć klasy / semestru');
    },
  });

  return {
    // Education levels
    educationLevels: (eduQuery.data || []) as EducationLevelItem[],
    isLoadingEdu: eduQuery.isLoading,
    createEducationLevel: createEduMutation.mutateAsync,
    deleteEducationLevel: deleteEduMutation.mutateAsync,

    // Class levels
    classLevels: (classQuery.data || []) as ClassLevelItem[],
    isLoadingClass: classQuery.isLoading,
    createClassLevel: createClassMutation.mutateAsync,
    deleteClassLevel: deleteClassMutation.mutateAsync,
  };
}
