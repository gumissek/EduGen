import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import ApiKeyForm from '@/components/settings/ApiKeyForm';
import ModelSelector from '@/components/settings/ModelSelector';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default function SettingsPage() {
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Typography
          variant="h4"
          fontWeight="800"
          gutterBottom
          sx={{ fontSize: { xs: '1.4rem', sm: '2rem', md: '2.125rem' } }}
          color='text.primary'
        >
          Ustawienia aplikacji
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          Zarządzaj kluczami API i modelem sztucznej inteligencji.
        </Typography>
        <Alert severity="info" sx={{ mt: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Nie mamy dostępu do Twoich kluczy API! Twój klucz jest szyfrowany i przechowywany bezpiecznie w bazie danych.
        </Alert>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 4 },
          mb: { xs: 2, sm: 4 },
          borderRadius: { xs: '16px', sm: '24px' },
          borderColor: 'divider',
          boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex' }}>
            <VpnKeyIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Klucze API (OpenRouter)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 2, sm: 3 }, display: { xs: 'none', sm: 'block' } }}>
          Zarządzaj swoimi kluczami API do OpenRouter. Klucze są szyfrowane i bezpiecznie przechowywane.
        </Typography>
        <Divider sx={{ mb: { xs: 2, sm: 3 } }} />
        <ApiKeyForm />
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 4 },
          mb: { xs: 2, sm: 4 },
          borderRadius: { xs: '16px', sm: '24px' },
          borderColor: 'divider',
          boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'secondary.main', color: 'secondary.contrastText', display: 'flex' }}>
            <AutoAwesomeIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Preferencje Modelu AI
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 2, sm: 3 }, display: { xs: 'none', sm: 'block' } }}>
          Wybierz domyślny model językowy. Modele dostępne przez OpenRouter.
        </Typography>
        <Divider sx={{ mb: { xs: 2, sm: 3 } }} />
        <ModelSelector />
      </Paper>
    </Box>
  );
}
