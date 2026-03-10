'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import SaveIcon from '@mui/icons-material/Save';

export default function BackupPanel() {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Automatyczne kopie tworzone są co 24 godziny. Retencja: 7 dni.
      </Typography>
      
      <Button 
        variant="outlined" 
        startIcon={<SaveIcon />}
        sx={{ mt: 1, mb: 3, height: 48, px: 3, fontWeight: 600 }}
      >
        Utwórz kopię zapasową
      </Button>

      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.01)', borderRadius: 3, borderStyle: 'dashed' }}>
        <Typography variant="body2" color="text.secondary">
          Brak ręcznych kopii zapasowych
        </Typography>
      </Paper>
    </Box>
  );
}
