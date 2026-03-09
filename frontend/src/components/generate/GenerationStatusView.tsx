'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useRouter } from 'next/navigation';
import { useGenerations } from '@/hooks/useGenerations';

export default function GenerationStatusView({ id }: { id: string }) {
  const router = useRouter();
  const { generationStatus, isLoadingStatus, isErrorStatus } = useGenerations(id);

  // Auto-redirect when ready
  React.useEffect(() => {
    if (generationStatus?.status === 'ready') {
      const timer = setTimeout(() => {
        router.push(`/generate/${id}/editor`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [generationStatus?.status, id, router]);

  if (isLoadingStatus && !generationStatus) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isErrorStatus || !generationStatus) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
        <ErrorOutlineIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h5" color="error" gutterBottom>
          Nie udało się pobrać statusu generowania
        </Typography>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => router.push('/generate')}>
          Wróć do konfiguracji
        </Button>
      </Paper>
    );
  }

  const { status, error_message } = generationStatus;

  return (
    <Paper sx={{ p: 6, textAlign: 'center', maxWidth: 600, mx: 'auto', mt: 4 }}>
      {status === 'processing' || status === 'draft' ? (
        <>
          <CircularProgress size={64} sx={{ mb: 4 }} />
          <Typography variant="h5" gutterBottom>
            Trwa generowanie materiałów przez AI...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ten proces może potrwać do 60 sekund. Nie odświeżaj strony.
          </Typography>
        </>
      ) : status === 'ready' ? (
        <>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64, mb: 4 }} />
          <Typography variant="h5" gutterBottom>
            Materiał jest gotowy!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Przekierowywanie do edytora...
          </Typography>
          <Button variant="contained" onClick={() => router.push(`/generate/${id}/editor`)}>
            Otwórz edytor teraz
          </Button>
        </>
      ) : ( // error
        <>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 64, mb: 4 }} />
          <Typography variant="h5" color="error" gutterBottom>
            Wystąpił błąd
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {error_message || 'Błąd generowania AI. Spróbuj ponownie lub zmień parametry.'}
          </Typography>
          <Button variant="outlined" onClick={() => router.push('/generate')}>
            Wróć do konfiguracji
          </Button>
        </>
      )}
    </Paper>
  );
}
