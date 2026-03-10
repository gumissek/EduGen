'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #014883 0%, #009FE3 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, sm: 6 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 440,
          width: '100%',
          borderRadius: '24px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
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
          EduGen
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4, lineHeight: 1.6 }}>
          Zaloguj się hasłem z pliku konfiguracyjnego, aby uzyskać bezpieczny dostęp do generatora materiałów.
        </Typography>
        <LoginForm />
      </Paper>
    </Box>
  );
}
