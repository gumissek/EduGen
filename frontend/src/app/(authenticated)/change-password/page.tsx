import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import LockResetIcon from '@mui/icons-material/LockReset';

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
        variant="outlined"
        sx={{
          p: { xs: 4, sm: 5 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 440,
          width: '100%',
          borderRadius: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
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
          mb: 3
        }}>
          <LockResetIcon fontSize="large" />
        </Box>
        <Typography component="h1" variant="h5" fontWeight="800" color="text.primary" gutterBottom>
          Zmień hasło
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4, lineHeight: 1.6 }}>
          Ze względów bezpieczeństwa prosimy o ustawienie własnego, silnego hasła dostępu do systemu.
        </Typography>
        <ChangePasswordForm />
      </Paper>
    </Box>
  );
}
