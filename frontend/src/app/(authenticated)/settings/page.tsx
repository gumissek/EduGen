import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import ApiKeyForm from '@/components/settings/ApiKeyForm';
import ModelSelector from '@/components/settings/ModelSelector';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default function SettingsPage() {
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, sm: 2 } }}>
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Typography variant="h4" fontWeight="800" gutterBottom sx={{ fontSize: { xs: '1.6rem', sm: '2.125rem' } }}>
          Ustawienia aplikacji
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Zarządzaj kluczami API i modelem sztucznej inteligencji.
        </Typography>
      </Box>
      
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, mb: 4, borderRadius: '24px', borderColor: 'divider', boxShadow: '0 4px 24px rgba(0,0,0,0.02)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex' }}>
            <VpnKeyIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="bold">
            Klucze API (OpenRouter)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Zarządzaj swoimi kluczami API do OpenRouter. Klucze są szyfrowane i bezpiecznie przechowywane.
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <ApiKeyForm />
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, mb: 4, borderRadius: '24px', borderColor: 'divider', boxShadow: '0 4px 24px rgba(0,0,0,0.02)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'secondary.main', color: 'secondary.contrastText', display: 'flex' }}>
            <AutoAwesomeIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="bold">
            Preferencje Modelu AI
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Wybierz domyślny model językowy. Modele dostępne przez OpenRouter.
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <ModelSelector />
      </Paper>
    </Box>
  );
}
