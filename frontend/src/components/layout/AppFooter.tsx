'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Image from 'next/image';

interface AppFooterProps {
  compact?: boolean;
}

export default function AppFooter({ compact = false }: AppFooterProps) {
  return (
    <Box
      component="footer"
      sx={{
        mt: compact ? 3 : 5,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          maxWidth: 1440,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
        }}
      >
        <Stack spacing={0.6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 28, height: 28, position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
              <Image src="/logo.png" alt="EduGen logo" fill sizes="28px" />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              EduGen
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Kontakt: bilinski.piotr89@gmail.com
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
          <Button component="a" href="mailto:bilinski.piotr89@gmail.com" size="small" variant="text">
            Napisz do nas
          </Button>
        </Stack>
      </Box>
      {!compact && <Divider />}
    </Box>
  );
}
