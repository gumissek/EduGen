'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
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

interface PrototypeData {
  id: string;
  generation_id: string;
  original_content: string;
  edited_content: string | null;
  answer_key: string;
  created_at: string;
  updated_at: string;
}

interface DocumentData {
  id: string;
  generation_id: string;
  filename: string;
  file_path: string;
  variants_count: number;
  created_at: string;
}

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();
  const [content, setContent] = React.useState('');
  const [isEdited, setIsEdited] = React.useState(false);

  // Fetch prototype data (contains the generated content)
  const { data: prototype, isLoading, isError } = useQuery<PrototypeData>({
    queryKey: ['prototype', id],
    queryFn: async () => {
      const res = await api.get(`/api/prototypes/${id}`);
      return res.data;
    },
    retry: 3,
    retryDelay: 2000,
  });

  // Set initial content once loaded (prefer edited_content over original)
  React.useEffect(() => {
    if (prototype && !isEdited) {
      const initialContent = prototype.edited_content || prototype.original_content;
      setContent(initialContent);
    }
  }, [prototype, isEdited]);

  // Save manual edits mutation — PUT /api/prototypes/{generation_id}
  const saveMutation = useMutation({
    mutationFn: async (htmlContent: string) => {
      await api.put(`/api/prototypes/${id}`, { edited_content: htmlContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototype', id] });
      success('Zmiany zostały zapisane');
    },
    onError: () => {
      error('Nie udało się zapisać zmian');
    },
  });

  // Reprompt mutation — POST /api/prototypes/{generation_id}/reprompt
  const repromptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await api.post(`/api/prototypes/${id}/reprompt`, { prompt });
      return res.data as PrototypeData;
    },
    onSuccess: (data: PrototypeData) => {
      const newContent = data.edited_content || data.original_content;
      setContent(newContent);
      setIsEdited(true);
      queryClient.invalidateQueries({ queryKey: ['prototype', id] });
      success('AI zaktualizowało treść');
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail: string = axiosErr?.response?.data?.detail ?? '';

      if (
        detail.includes('nieprawidłowy JSON') ||
        detail.includes('JSONDecodeError') ||
        detail.includes('nie zawiera klucza') ||
        detail.includes('nie jest listą')
      ) {
        // OpenAI returned malformed / unexpected JSON — safe to retry
        error('AI zwróciło niepoprawną odpowiedź (błąd formatu JSON). Spróbuj wysłać poprawkę ponownie – zwykle wystarczy powtórzyć zapytanie.');
      } else if (detail.includes('API key') || detail.includes('api_key') || detail.includes('Incorrect API key')) {
        error('Brak lub nieprawidłowy klucz API OpenAI. Sprawdź konfigurację w Ustawieniach.');
      } else if (detail.includes('Rate limit') || detail.includes('rate_limit') || detail.includes('429')) {
        error('Przekroczono limit zapytań OpenAI (Rate Limit). Poczekaj chwilę i spróbuj ponownie.');
      } else if (detail) {
        error(`Błąd aktualizacji AI: ${detail}`);
      } else {
        error('Błąd podczas próby aktualizacji przez AI. Spróbuj ponownie.');
      }
    },
  });

  // Finalize mutation — POST /api/documents/{generation_id}/finalize
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      // Save pending edits first
      await saveMutation.mutateAsync(content);
      // Create final document
      const res = await api.post(`/api/documents/${id}/finalize`);
      return res.data as DocumentData;
    },
    onSuccess: (data: DocumentData) => {
      success('Materiał sfinalizowany!');
      router.push(`/documents/${data.id}`);
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !prototype) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Nie znaleziono materiału lub wystąpił błąd podczas ładowania. Upewnij się, że generowanie zostało zakończone.
      </Alert>
    );
  }

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
            {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz postęp'}
          </Button>
          <Button 
            variant="contained" 
            color="success"
            startIcon={finalizeMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
            onClick={() => finalizeMutation.mutate()}
            disabled={finalizeMutation.isPending || saveMutation.isPending}
          >
            {finalizeMutation.isPending ? 'Finalizowanie...' : 'Finalizuj i Dodaj do Bazy'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, position: 'relative', pb: 10 }}>
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
