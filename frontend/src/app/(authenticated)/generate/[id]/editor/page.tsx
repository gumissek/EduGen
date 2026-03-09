'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import dynamic from 'next/dynamic';
import RepromptInput from '@/components/editor/RepromptInput';

// Lazy load TipTap to avoid SSR issues
const TipTapEditor = dynamic(() => import('@/components/editor/TipTapEditor'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  ),
});

export default function EditorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();
  const [content, setContent] = React.useState('');
  const [isEdited, setIsEdited] = React.useState(false);

  // Fetch generation data
  const { data: generation, isLoading } = useQuery({
    queryKey: ['generation', params.id],
    queryFn: async () => {
      const res = await api.get(`/api/generations/${params.id}`);
      return res.data;
    },
  });

  // Set initial content once loaded
  React.useEffect(() => {
    if (generation?.content && !isEdited) {
      setContent(generation.content);
    }
  }, [generation, isEdited]);

  // Save manual edits mutation
  const saveMutation = useMutation({
    mutationFn: async (htmlContent: string) => {
      await api.put(`/api/generations/${params.id}`, { content: htmlContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generation', params.id] });
      success('Zmiany zostały zapisane');
    },
    onError: () => {
      error('Nie udało się zapisać zmian');
    },
  });

  // Reprompt mutation
  const repromptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await api.post(`/api/generations/${params.id}/reprompt`, { prompt });
      return res.data;
    },
    onSuccess: (data: { content: string }) => {
      setContent(data.content);
      setIsEdited(true);
      queryClient.invalidateQueries({ queryKey: ['generation', params.id] });
      success('AI zaktualizowało treść');
    },
    onError: () => {
      error('Błąd podczas próby aktualizacji przez AI');
    },
  });

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      // Save pending edits first
      await saveMutation.mutateAsync(content);
      // Finalize
      const res = await api.post(`/api/generations/${params.id}/finalize`);
      return res.data;
    },
    onSuccess: (data: { document_id: string }) => {
      success('Materiał sfinalizowany!');
      router.push(`/documents/${data.document_id}`); // Corrected route
    },
    onError: () => {
      error('Błąd podczas finalizacji');
    },
  });

  const handleEditorChange = (newContent: string) => {
    setContent(newContent);
    setIsEdited(true);
  };

  const handleSave = () => {
    saveMutation.mutate(content);
  };

  if (isLoading) return <CircularProgress />;
  if (!generation) return <Typography>Nie znaleziono materiału.</Typography>;

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          Edytor materiału
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            Zapisz postęp
          </Button>
          <Button 
            variant="contained" 
            color="success"
            startIcon={<CheckIcon />}
            onClick={() => finalizeMutation.mutate()}
            disabled={finalizeMutation.isPending}
          >
            Finalizuj i Dodaj do Bazy
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <TipTapEditor 
          initialContent={content} 
          onChange={handleEditorChange} 
        />
        
        <RepromptInput 
          onSend={async (p) => { await repromptMutation.mutateAsync(p); }} 
          isLoading={repromptMutation.isPending} 
        />
      </Box>
    </Box>
  );
}
