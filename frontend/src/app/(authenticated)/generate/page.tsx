'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import GenerationWizard from '@/components/generate/GenerationWizard';

export default function GeneratePage() {
  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Kreator materiałów
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Skonfiguruj parametry, aby wygenerować dopasowany materiał edukacyjny.
      </Typography>
      
      <GenerationWizard />
    </Box>
  );
}
