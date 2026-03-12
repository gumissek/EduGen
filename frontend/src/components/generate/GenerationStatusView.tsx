'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Chip from '@mui/material/Chip';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import TimerIcon from '@mui/icons-material/Timer';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import BlockIcon from '@mui/icons-material/Block';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useRouter } from 'next/navigation';
import { useGenerations } from '@/hooks/useGenerations';

const REDIRECT_DELAY_S = 5;
const LAST_STEP_KEY = 'edugen-generation-step';

/** Classify the raw error_message from the backend into a user-friendly object. */
function classifyError(raw?: string): { title: string; detail: string; hint: string; icon: React.ReactNode } {
  const msg = (raw ?? '').toLowerCase();

  if (msg.includes('api key') || msg.includes('not configured') || msg.includes('no active')) {
    return {
      title: 'Brak skonfigurowanego klucza API',
      detail: 'Nie znaleziono aktywnego klucza OpenRouter. Generowanie nie mogło się rozpocząć.',
      hint: 'Przejdź do Ustawień → Klucze API i dodaj lub aktywuj klucz OpenRouter.',
      icon: <VpnKeyIcon sx={{ fontSize: 40 }} />,
    };
  }
  if (msg.includes('quota') || msg.includes('credits') || msg.includes('insufficient') || msg.includes('balance')) {
    return {
      title: 'Niewystarczające środki na koncie OpenRouter',
      detail: 'Twoje konto OpenRouter ma za mało kredytów, aby ukończyć generowanie.',
      hint: 'Doładuj konto na openrouter.ai i spróbuj ponownie.',
      icon: <BlockIcon sx={{ fontSize: 40 }} />,
    };
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
    return {
      title: 'Zbyt wiele żądań (rate limit)',
      detail: 'Przekroczono limit żądań do OpenRouter lub wybranego modelu.',
      hint: 'Odczekaj kilka minut i spróbuj ponownie. Możesz też wybrać inny model w Ustawieniach.',
      icon: <WarningAmberIcon sx={{ fontSize: 40 }} />,
    };
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline')) {
    return {
      title: 'Przekroczono czas oczekiwania',
      detail: 'Model AI nie odpowiedział w wyznaczonym czasie (zazwyczaj 90 s).',
      hint: 'Spróbuj zmniejszyć liczbę pytań lub wybrać szybszy model. Usuń zbędne pliki źródłowe.',
      icon: <TimerIcon sx={{ fontSize: 40 }} />,
    };
  }
  if (msg.includes('network') || msg.includes('connection') || msg.includes('socket')) {
    return {
      title: 'Błąd połączenia sieciowego',
      detail: 'Nie udało się nawiązać połączenia z serwerem OpenRouter.',
      hint: 'Sprawdź połączenie internetowe i stan serwisu na status.openrouter.ai.',
      icon: <SignalWifiOffIcon sx={{ fontSize: 40 }} />,
    };
  }

  return {
    title: 'Błąd generowania materiału',
    detail: raw || 'Wystąpił nieznany błąd komunikacji z modelem AI.',
    hint: 'Sprawdź ustawienia, zmień parametry i spróbuj wygenerować ponownie.',
    icon: <ErrorOutlineIcon sx={{ fontSize: 40 }} />,
  };
}

export default function GenerationStatusView({ id }: { id: string }) {
  const router = useRouter();
  const { generationStatus, isLoadingStatus, isErrorStatus } = useGenerations(id);
  const [countdown, setCountdown] = React.useState<number | null>(null);

  // Auto-redirect when ready
  React.useEffect(() => {
    if (generationStatus?.status === 'ready') {
      const timer = setTimeout(() => {
        router.push(`/generate/${id}/editor`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [generationStatus?.status, id, router]);

  // On error: save step=4 (review) to localStorage and start 5-second countdown
  React.useEffect(() => {
    if (generationStatus?.status === 'error') {
      // Restore the wizard back to the review step
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_STEP_KEY, '4');
      }
      setCountdown(REDIRECT_DELAY_S);
    }
  }, [generationStatus?.status]);

  // Countdown tick
  React.useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      router.push('/generate');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown, router]);

  if (isLoadingStatus && !generationStatus) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isErrorStatus || !generationStatus) {
    return (
      <Paper sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center', maxWidth: 600, mx: 'auto', borderRadius: '24px' }}>
        <ErrorOutlineIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h5" color="error" gutterBottom>
          Nie udało się pobrać statusu generowania
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sprawdź połączenie sieciowe lub odśwież stronę.
        </Typography>
        <Button variant="outlined" sx={{ mt: 1 }} onClick={() => router.push('/generate')}>
          Wróć do konfiguracji
        </Button>
      </Paper>
    );
  }

  const { status, error_message } = generationStatus;
  const errorInfo = status === 'error' ? classifyError(error_message) : null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 8 }, textAlign: 'center', maxWidth: 600, mx: 'auto', mt: { xs: 2, md: 8 }, borderRadius: '24px', borderColor: 'divider', boxShadow: '0 12px 48px rgba(0,0,0,0.05)' }}>
      {status === 'processing' || status === 'draft' || status === 'pending' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ 
            position: 'relative', display: 'inline-flex', mb: 5,
            '&::before': {
              content: '""', position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
              borderRadius: '50%', bgcolor: 'primary.main', opacity: 0.1, zIndex: 0,
              animation: 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            },
            '@keyframes pulseRing': {
              '0%': { transform: 'scale(0.8)', opacity: 0.5 },
              '100%': { transform: 'scale(1.5)', opacity: 0 }
            }
          }}>
            <CircularProgress size={80} thickness={4} sx={{ position: 'relative', zIndex: 1 }} />
            <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" component="div" color="text.secondary" fontWeight="bold">AI</Typography>
            </Box>
          </Box>
          <Typography variant="h5" fontWeight="800" gutterBottom>
            Trwa generowanie materiałów...
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
            Ten proces może potrwać do 60 sekund. Model AI aktualnie opracowuje treść na podstawie Twoich wytycznych.
          </Typography>
        </Box>
      ) : status === 'ready' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'success.main', color: 'success.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4, boxShadow: '0 8px 16px rgba(46, 125, 50, 0.2)' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h4" fontWeight="800" gutterBottom>
            Materiał jest gotowy!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
            Przekierowywanie do edytora w przeciągu kilku sekund...
          </Typography>
          <Button variant="contained" color="primary" onClick={() => router.push(`/generate/${id}/editor`)} sx={{ px: 4, height: 48, borderRadius: 2, fontWeight: 600 }}>
            Otwórz edytor teraz
          </Button>
        </Box>
      ) : ( // error
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'error.main', color: 'error.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, boxShadow: '0 8px 16px rgba(211, 47, 47, 0.2)' }}>
            {errorInfo!.icon}
          </Box>

          <Typography variant="h5" fontWeight="800" color="error" gutterBottom>
            {errorInfo!.title}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 440, mx: 'auto' }}>
            {errorInfo!.detail}
          </Typography>

          <Alert severity="info" sx={{ mb: 4, textAlign: 'left', borderRadius: 3, maxWidth: 440, width: '100%' }}>
            <AlertTitle sx={{ fontWeight: 700 }}>Co możesz zrobić?</AlertTitle>
            {errorInfo!.hint}
          </Alert>

          {/* Raw error message for advanced users */}
          {error_message && (
            <Box sx={{ mb: 4, maxWidth: 440, width: '100%' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                Szczegóły techniczne:
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', wordBreak: 'break-all', textAlign: 'left' }}>
                {error_message}
              </Paper>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'center', width: '100%', maxWidth: 440 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => router.push('/generate')}
              sx={{ px: 3, height: 48, borderRadius: 2, fontWeight: 600, width: { xs: '100%', sm: 'auto' } }}
            >
              Wróć teraz
            </Button>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              {countdown !== null && (
                <>
                  <Chip
                    icon={<TimerIcon />}
                    label={`Powrót za ${countdown} s`}
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                </>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
