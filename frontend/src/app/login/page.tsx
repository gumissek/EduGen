'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
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
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 400,
          width: '100%',
        }}
      >
        <Typography component="h1" variant="h4" fontWeight="bold" color="primary" gutterBottom>
          EduGen Local
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Podaj hasło z pliku konfiguracyjnego, aby uzyskać dostęp do swoich materiałów.
        </Typography>
        <LoginForm />
      </Paper>
    </Box>
  );
}
