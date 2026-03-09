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
    <AppBar position="fixed" sx={{ zIndex: (theme: Theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        <IconButton color="inherit" onClick={toggleColorMode}>
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
        <IconButton color="inherit" onClick={handleLogout}>
          <LogoutIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
