import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useTaskTypes() {
  const queryClient = useQueryClient();

  const { data: taskTypes = [], isLoading } = useQuery<string[]>({
    queryKey: ['taskTypes'],
    queryFn: async () => {
      const res = await api.get('/api/task-types');
      return res.data;
    },
  });

  const { mutateAsync: createTaskType } = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/api/task-types', { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTypes'] });
    },
  });

  return { taskTypes, isLoading, createTaskType };
}
