'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Image from 'next/image';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useColorMode } from '@/theme/ColorModeContext';

export default function PublicTopBar() {
  const pathname = usePathname();
  const { mode, toggleColorMode } = useColorMode();

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(14px)',
        bgcolor: mode === 'dark' ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.8)',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, sm: 70 }, px: { xs: 2, sm: 3 } }}>
        <Box component={NextLink} href="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.1, textDecoration: 'none', color: 'inherit' }}>
          <Box sx={{ width: 34, height: 34, position: 'relative', borderRadius: 1.5, overflow: 'hidden' }}>
            <Image src="/logo.png" alt="EduGen logo" fill sizes="34px" priority />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            EduGen
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={0.7} sx={{ mr: 1.2, display: { xs: 'none', sm: 'flex' } }}>
          <Button component={NextLink} href="/" color={pathname === '/' ? 'primary' : 'inherit'}>
            Start
          </Button>
          <Button component={NextLink} href="/about" color={pathname === '/about' ? 'primary' : 'inherit'}>
            O nas
          </Button>
        </Stack>

        <Tooltip title={mode === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}>
          <IconButton onClick={toggleColorMode} color="inherit" sx={{ mr: { xs: 0.5, sm: 1 } }}>
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>

        <Stack direction="row" spacing={1}>
          <Button component={NextLink} href="/login" variant={pathname === '/login' ? 'contained' : 'text'}>
            Zaloguj się
          </Button>
          <Button component={NextLink} href="/register" variant={pathname === '/register' ? 'contained' : 'outlined'}>
            Załóż konto
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
