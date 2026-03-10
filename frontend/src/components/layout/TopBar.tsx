// ... (TopBar logic, will be implemented with MUI AppBar)
'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { Theme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { useColorMode } from '@/theme/ColorModeContext';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { mode, toggleColorMode } = useColorMode();
  const pathname = usePathname();
  const { logout } = useAuth();

  // Simple title mapping
  let title = 'EduGen Local';
  if (pathname.includes('/dashboard')) title = 'Historia materiałów';
  if (pathname.includes('/generate')) title = 'Kreator materiałów';
  if (pathname.includes('/subjects')) title = 'Przedmioty i pliki';
  if (pathname.includes('/settings')) title = 'Ustawienia';
  if (pathname.includes('/diagnostics')) title = 'Diagnostyka';

  const handleLogout = () => {
    logout();
  };

  return (
    <AppBar 
      position="fixed" 
      color="inherit"
      elevation={0}
      sx={{ 
        zIndex: (theme: Theme) => theme.zIndex.drawer + 1,
        background: mode === 'dark' ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid',
        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        boxShadow: mode === 'dark' ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.03)',
        transition: 'all 0.3s ease',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={mode === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}>
            <IconButton 
              color="inherit" 
              onClick={toggleColorMode}
              sx={{ 
                bgcolor: 'action.hover', 
                '&:hover': { bgcolor: 'action.selected', transform: 'scale(1.05)' },
                transition: 'all 0.2s',
              }}
            >
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Wyloguj się">
            <IconButton 
              color="error" 
              onClick={handleLogout}
              sx={{ 
                bgcolor: 'error.veryLight',
                '&:hover': { bgcolor: mode === 'light' ? 'error.veryLight' : 'error.main', color: 'white', transform: 'scale(1.05)' },
                transition: 'all 0.2s',
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
