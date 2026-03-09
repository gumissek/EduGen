'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import GenerationStatusView from '@/components/generate/GenerationStatusView';

export default function GenerationStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  return (
    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <GenerationStatusView id={id} />
    </Box>
  );
}
