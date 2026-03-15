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
import { extractCommentsFromHtml } from '@/components/editor/TipTapEditor';
import ComplianceSidebar from '@/components/editor/ComplianceSidebar';
import { useCurriculumCompliance } from '@/hooks/useCurriculum';
import { ComplianceResult } from '@/types';

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
  compliance_json: string | null;
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
  const [complianceOpen, setComplianceOpen] = React.useState(false);

  // Fetch generation to check if compliance was enabled
  const { data: generation } = useQuery<{ curriculum_compliance_enabled: boolean }>({
    queryKey: ['generation', id],
    queryFn: async () => {
      const res = await api.get(`/api/generations/${id}`);
      return res.data;
    },
  });

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

  const generationId = prototype?.generation_id ?? '';
  const { runCompliance, complianceData: mutationComplianceData, isLoading: complianceLoading } = useCurriculumCompliance(generationId);

  const handleRunCompliance = React.useCallback(async () => {
    try {
      await runCompliance();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } };
      const detail = axiosErr?.response?.data?.detail ?? '';
      error(detail || 'Wystąpił błąd podczas weryfikacji zgodności z Podstawą Programową.');
    }
  }, [runCompliance, error]);

  // Parse compliance from saved prototype or from fresh mutation result
  let complianceData: ComplianceResult | null = null;
  if (mutationComplianceData) {
    complianceData = mutationComplianceData as ComplianceResult;
  } else if (prototype?.compliance_json) {
    try {
      complianceData = JSON.parse(prototype.compliance_json) as ComplianceResult;
    } catch {
      complianceData = null;
    }
  }

  React.useEffect(() => {
    if (prototype && !isEdited) {
      const initialContent = prototype.edited_content || prototype.original_content;
      setContent(initialContent);
    }
  }, [prototype, isEdited]);

  const saveMutation = useMutation({
    mutationFn: async (htmlContent: string) => {
      const commentsJson = extractCommentsFromHtml(htmlContent);
      await api.put(`/api/prototypes/${id}`, {
        edited_content: htmlContent,
        comments_json: commentsJson ?? undefined,
      });
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
      
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Edytor materiału
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <Button 
            variant="outlined" 
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saveMutation.isPending}
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz wersję roboczą'}
          </Button>
          <Button 
            variant="contained" 
            color="success"
            startIcon={finalizeMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
            onClick={() => finalizeMutation.mutate()}
            disabled={finalizeMutation.isPending || saveMutation.isPending}
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            {finalizeMutation.isPending ? 'Finalizowanie...' : 'Finalizuj i Dodaj do Bazy'}
          </Button>
          <ComplianceSidebar
            complianceData={complianceData}
            onRunCompliance={handleRunCompliance}
            isLoading={complianceLoading}
            isOpen={complianceOpen}
            onToggle={() => setComplianceOpen((o) => !o)}
            isAvailable={generation?.curriculum_compliance_enabled ?? false}
          />
        </Box>
      </Box>

      {/* Kontener edytora */}
      <Box sx={{ flexGrow: 1 }}>
        <TipTapEditor 
          initialContent={content} 
          onChange={handleEditorChange} 
        />
      </Box>

      {/* Fixed bar – zawsze przyklejony do dołu viewportu, z odstępem od krawędzi */}
      <Box 
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 20, md: 28 },
          left: { xs: 0, md: '260px' },
          right: 0,
          zIndex: 1200,
          display: 'flex',
          justifyContent: 'center',
          px: { xs: 2, md: 4 },
        }}
      >
        <RepromptInput 
          onSend={async (p) => { await repromptMutation.mutateAsync(p); }} 
          isLoading={repromptMutation.isPending} 
        />
      </Box>
    </Box>
  );
}