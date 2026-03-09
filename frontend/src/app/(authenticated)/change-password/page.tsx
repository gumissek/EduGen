import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';

export default function ChangePasswordPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 440,
          width: '100%',
        }}
      >
        <Typography component="h1" variant="h5" fontWeight="bold" color="primary" gutterBottom>
          Zmiana hasła
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Używasz domyślnego hasła. Ustaw własne hasło, aby kontynuować.
        </Typography>
        <ChangePasswordForm />
      </Paper>
    </Box>
  );
}
