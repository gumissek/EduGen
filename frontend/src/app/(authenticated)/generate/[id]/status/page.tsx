'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import GenerationStatusView from '@/components/generate/GenerationStatusView';

export default function GenerationStatusPage({ params }: { params: { id: string } }) {
  // Extract id from params directly on the client side rendering
  return (
    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <GenerationStatusView id={params.id} />
    </Box>
  );
}
