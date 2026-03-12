'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RegisterForm from '@/components/auth/RegisterForm';
import NextLink from 'next/link';

export default function RegisterPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, rgba(1,72,131,0.08) 0%, rgba(255,255,255,1) 70%)'
            : 'linear-gradient(135deg, rgba(47,110,163,0.18) 0%, rgba(18,18,18,1) 70%)',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, sm: 6 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 480,
          width: '100%',
          borderRadius: '24px',
          boxShadow: (theme) =>
            theme.palette.mode === 'light' ? '0 18px 44px rgba(0,0,0,0.12)' : '0 18px 44px rgba(0,0,0,0.45)',
        }}
      >
        <Box sx={{ 
          width: 56, 
          height: 56, 
          bgcolor: 'primary.main', 
          borderRadius: 3, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'primary.contrastText',
          mb: 3,
          boxShadow: '0 8px 16px rgba(1, 72, 131, 0.25)'
        }}>
          <AutoAwesomeIcon fontSize="large" />
        </Box>
        <Typography component="h1" variant="h4" fontWeight="800" color="text.primary" gutterBottom>
          Utwórz konto
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4, lineHeight: 1.6 }}>
          Zarejestruj się, aby zacząć generować materiały edukacyjne.
        </Typography>
        <RegisterForm />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Masz już konto?{' '}
          <Link component={NextLink} href="/login" underline="hover" fontWeight={600}>
            Zaloguj się
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
