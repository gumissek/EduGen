'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LoginIcon from '@mui/icons-material/Login';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function EmailChangeSucceededPage() {
  const router = useRouter();
  const { logout, isAuthenticated } = useAuth();
  const [countdown, setCountdown] = React.useState(10);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (isAuthenticated()) {
            logout();
          } else {
            router.push('/login');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [logout, router, isAuthenticated]);

  const handleGoToLogin = () => {
    if (isAuthenticated()) {
      logout();
    } else {
      router.push('/login');
    }
  };

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
        <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Adres e-mail został zmieniony
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Twój adres e-mail został pomyślnie zaktualizowany.
          Zaloguj się ponownie używając nowego adresu e-mail.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Automatyczne przekierowanie do strony logowania za <strong>{countdown}</strong> sekund...
        </Typography>
        <Button
          variant="contained"
          startIcon={<LoginIcon />}
          onClick={handleGoToLogin}
          size="large"
        >
          Przejdź do logowania
        </Button>
      </Paper>
    </Box>
  );
}
