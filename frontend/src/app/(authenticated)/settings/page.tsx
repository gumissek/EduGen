import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import ApiKeyForm from '@/components/settings/ApiKeyForm';
import ModelSelector from '@/components/settings/ModelSelector';
import BackupPanel from '@/components/settings/BackupPanel';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StorageIcon from '@mui/icons-material/Storage';

export default function SettingsPage() {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 0, sm: 2 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="800" gutterBottom>
          Ustawienia aplikacji
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Zarządzaj modelem sztucznej inteligencji, kopiami zapasowymi i parametrami działania.
        </Typography>
      </Box>
      
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, mb: 4, borderRadius: '24px', borderColor: 'divider', boxShadow: '0 4px 24px rgba(0,0,0,0.02)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex' }}>
            <VpnKeyIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="bold">
            Klucz API OpenAI
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Twój klucz, używany do komunikacji z modelami generatywnymi.
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
          Wybierz domyślny model językowy, który osiąga najlepsze rezultaty zadaniowe.
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <ModelSelector />
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderRadius: '24px', borderColor: 'divider', boxShadow: '0 4px 24px rgba(0,0,0,0.02)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'info.main', color: 'info.contrastText', display: 'flex' }}>
            <StorageIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="bold">
            Kopie zapasowe i dane
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Eksportuj i importuj swoje dane aplikacji, zabezpieczając wygenerowane materiały.
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <BackupPanel />
      </Paper>
    </Box>
  );
}
