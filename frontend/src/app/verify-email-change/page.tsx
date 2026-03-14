'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LoginIcon from '@mui/icons-material/Login';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

function VerifyEmailChangeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = React.useState('');
  const hasVerified = React.useRef(false);

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Brak tokena weryfikacyjnego w adresie URL');
      return;
    }

    if (hasVerified.current) return;
    hasVerified.current = true;

    api
      .get('/api/auth/verify-email-change', { params: { token } })
      .then(() => {
        setStatus('success');
        // Redirect to success page after a brief moment
        setTimeout(() => {
          router.push('/email-change-succeeded');
        }, 500);
      })
      .catch((err: unknown) => {
        setStatus('error');
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setErrorMessage(detail ?? 'Nie udało się zweryfikować zmiany adresu e-mail');
      });
  }, [token, router]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          maxWidth: 520,
          width: '100%',
          p: { xs: 3, sm: 5 },
          borderRadius: '24px',
          textAlign: 'center',
        }}
      >
        {status === 'loading' && (
          <>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" fontWeight="bold">
              Weryfikacja zmiany adresu e-mail...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Proszę czekać, trwa potwierdzanie zmiany.
            </Typography>
          </>
        )}

        {status === 'error' && (
          <>
            <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Weryfikacja nie powiodła się
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {errorMessage}
            </Typography>
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={() => router.push('/login')}
            >
              Przejdź do logowania
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyEmailChangeContent />
    </React.Suspense>
  );
}
