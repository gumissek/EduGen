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
    <Paper variant="outlined" sx={{ p: { xs: 4, sm: 8 }, textAlign: 'center', maxWidth: 600, mx: 'auto', mt: { xs: 4, md: 8 }, borderRadius: '24px', borderColor: 'divider', boxShadow: '0 12px 48px rgba(0,0,0,0.05)' }}>
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
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'error.main', color: 'error.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4, boxShadow: '0 8px 16px rgba(211, 47, 47, 0.2)' }}>
            <ErrorOutlineIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h4" fontWeight="800" color="error" gutterBottom>
            Wystąpił błąd
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 5, maxWidth: 400, mx: 'auto' }}>
            {error_message || 'Błąd komunikacji z modelem AI. Prosimy o zmianę parametrów i próbę ponownego generowania.'}
          </Typography>
          <Button variant="outlined" color="error" onClick={() => router.push('/generate')} sx={{ px: 4, height: 48, borderRadius: 2, fontWeight: 600 }}>
            Wróć do konfiguracji
          </Button>
        </Box>
      )}
    </Paper>
  );
}
