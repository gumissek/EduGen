// TopBar — with user info, quota display, admin button
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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { useColorMode } from '@/theme/ColorModeContext';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { mode, toggleColorMode } = useColorMode();
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { user } = useCurrentUser();

  // Simple title mapping
  let title = 'EduGen Local';
  if (pathname.includes('/dashboard')) title = 'Historia materiałów';
  if (pathname.includes('/generate')) title = 'Kreator materiałów';
  if (pathname.includes('/subjects')) title = 'Przedmioty i pliki';
  if (pathname.includes('/settings')) title = 'Ustawienia';
  if (pathname.includes('/diagnostics')) title = 'Diagnostyka';
  if (pathname.includes('/admin-panel')) title = 'Panel administracyjny';

  const handleLogout = () => {
    logout();
  };

  // Build user display name
  const displayParts: string[] = [];
  if (user?.first_name) displayParts.push(user.first_name);
  if (user?.last_name) displayParts.push(user.last_name);
  const displayName = displayParts.length > 0 ? displayParts.join(' ') : null;

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
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, letterSpacing: '-0.01em', mr: 2 }}>
          {title}
        </Typography>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right side: user info + actions — all in one aligned row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

          {/* User name + email */}
          {user && (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', mr: 0.5 }}>
              {displayName && (
                <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160, lineHeight: 1.3 }}>
                  {displayName}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180, lineHeight: 1.3 }}>
                {user.email}
              </Typography>
            </Box>
          )}

          {/* Quota chip — show only if user has no secret keys */}
          {user && !user.has_secret_keys && (
            <Tooltip title={user.api_quota_reset ? `Reset: ${user.api_quota_reset}` : 'Limit zapytań API'}>
              <Chip
                label={`Quota: ${user.api_quota}`}
                size="small"
                variant="outlined"
                color="warning"
                sx={{ fontWeight: 600, fontSize: '0.75rem', flexShrink: 0 }}
              />
            </Tooltip>
          )}

          {/* Admin panel button — superuser only */}
          {user?.is_superuser && (
            <Tooltip title="Panel administracyjny">
              <IconButton
                color="primary"
                onClick={() => router.push('/admin-panel')}
                sx={{
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  flexShrink: 0,
                  '&:hover': { bgcolor: 'primary.main', transform: 'scale(1.05)' },
                  transition: 'all 0.2s',
                }}
              >
                <AdminPanelSettingsIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={mode === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}>
            <IconButton
              color="inherit"
              onClick={toggleColorMode}
              sx={{
                bgcolor: 'action.hover',
                flexShrink: 0,
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
                flexShrink: 0,
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
