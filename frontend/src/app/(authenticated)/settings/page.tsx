import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import ApiKeyForm from '@/components/settings/ApiKeyForm';
import ModelSelector from '@/components/settings/ModelSelector';
import BackupPanel from '@/components/settings/BackupPanel';

export default function SettingsPage() {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Ustawienia
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Klucz API OpenAI
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <ApiKeyForm />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Preferencje Modelu AI
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <ModelSelector />
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Kopie zapasowe i dane
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <BackupPanel />
      </Paper>
    </Box>
  );
}
