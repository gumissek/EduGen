'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 5, sm: 8 },
        textAlign: 'center',
        bgcolor: 'rgba(1, 72, 131, 0.02)',
        borderRadius: '24px',
        border: '2px dashed',
        borderColor: 'rgba(1, 72, 131, 0.15)',
      }}
    >
      <Box sx={{ color: 'text.disabled', '& > svg': { fontSize: 64 }, mb: 2 }}>{icon}</Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="outlined" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
