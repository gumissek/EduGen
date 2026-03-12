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

  // Fetch prototype data
  const { data: prototype, isLoading, isError } = useQuery<PrototypeData>({
    queryKey: ['prototype', id],
    queryFn: async () => {
      const res = await api.get(`/api/prototypes/${id}`);
      return res.data;
    },
    retry: 3,
    retryDelay: 2000,
  });

  React.useEffect(() => {
    if (prototype && !isEdited) {
      const initialContent = prototype.edited_content || prototype.original_content;
      setContent(initialContent);
    }
  }, [prototype, isEdited]);

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

  const repromptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      // 150 s — matches the 90 s backend timeout + generous network margin
      const res = await api.post(`/api/prototypes/${id}/reprompt`, { prompt }, { timeout: 150_000 });
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
      const axiosErr = err as {
        response?: { status?: number; data?: { detail?: string } };
        code?: string;
        message?: string;
      };

      // ── Network / proxy errors (no HTTP response received) ──────────────────
      if (!axiosErr.response) {
        const code = axiosErr.code ?? '';
        const msg  = (axiosErr.message ?? '').toLowerCase();
        if (code === 'ECONNABORTED' || msg.includes('timeout')) {
          error('Zapytanie do AI trwało zbyt długo i zostało anulowane. Spróbuj ponownie lub wybierz szybszy model AI w Ustawieniach.');
        } else {
          // ECONNRESET / socket hang up / network error
          error('Połączenie z serwerem zostało przerwane. AI może nadal przetwarzać Twoje zapytanie — odśwież stronę za chwilę lub spróbuj ponownie.');
        }
        return;
      }

      const status = axiosErr.response.status ?? 0;
      const detail: string = axiosErr.response.data?.detail ?? '';

      // ── 504 Gateway Timeout (backend hard limit hit) ─────────────────────────
      if (status === 504) {
        error(detail || 'Zapytanie do AI przekroczyło limit czasu serwera. Spróbuj ponownie lub wybierz szybszy model AI.');
        return;
      }

      // ── Application-level errors from the detail field ───────────────────────
      if (
        detail.includes('nieprawidłowy JSON') ||
        detail.includes('JSONDecodeError') ||
        detail.includes('nie zawiera klucza') ||
        detail.includes('nie jest listą')
      ) {
        error('AI zwróciło niepoprawną odpowiedź (błąd formatu JSON). Spróbuj wysłać poprawkę ponownie – zwykle wystarczy powtórzyć zapytanie.');
      } else if (detail.includes('API key') || detail.includes('api_key') || detail.includes('Incorrect API key')) {
        error('Brak lub nieprawidłowy klucz API OpenRouter. Sprawdź konfigurację w Ustawieniach.');
      } else if (detail.includes('Rate limit') || detail.includes('rate_limit') || detail.includes('429')) {
        error('Przekroczono limit zapytań OpenRouter (Rate Limit). Poczekaj chwilę i spróbuj ponownie.');
      } else if (detail) {
        error(`Błąd aktualizacji AI: ${detail}`);
      } else {
        error('Błąd podczas próby aktualizacji przez AI. Spróbuj ponownie.');
      }
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync(content);
      const generationId = prototype!.generation_id;
      const res = await api.post(`/api/documents/${generationId}/finalize`);
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
    <Box sx={{ minHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      
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

      {/* Kontener dla edytora i sticky inputu */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Kontener edytora */}
        <Box sx={{ flexGrow: 1, pb: 4 }}>
          <TipTapEditor 
            initialContent={content} 
            onChange={handleEditorChange} 
          />
        </Box>
        
        {/* Sticky wrapper kontrolujący pozycję Inputu */}
        <Box 
          sx={{ 
            position: 'sticky', 
            bottom: { xs: 16, md: 24 }, 
            zIndex: 50, // Podbity z-index, aby przysłaniał test za nim podczas scrolla
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            px: { xs: 2, md: 0 }, // Zabezpieczenie na mobile, żeby input nie przyklejał się do krawędzi ekranu
            mt: 2
          }}
        >
          <RepromptInput 
            onSend={async (p) => { await repromptMutation.mutateAsync(p); }} 
            isLoading={repromptMutation.isPending} 
          />
        </Box>

      </Box>
    </Box>
  );
}