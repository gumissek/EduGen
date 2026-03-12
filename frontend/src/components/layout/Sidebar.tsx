'use client';

import * as React from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Link from '@mui/material/Link';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

const drawerWidth = 260;

const menuItems = [
  { text: 'Generuj', icon: <AddCircleIcon />, path: '/generate' },
  { text: 'Materiały', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Przedmioty i Pliki', icon: <FolderOpenIcon />, path: '/subjects' },
  { text: 'Ustawienia', icon: <SettingsIcon />, path: '/settings' },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }} />
      <Box sx={{ overflow: 'auto', flexGrow: 1, pt: 2, px: 2 }}>
        <List>
          {menuItems.map((item) => {
            const isSelected = pathname.startsWith(item.path);
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: '12px',
                    mb: 1,
                    py: 1.25,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(1, 72, 131, 0.12)',
                      color: 'primary.main',
                      boxShadow: '0 2px 8px rgba(1, 72, 131, 0.08)',
                      transform: 'translateX(4px)',
                      '&:hover': {
                        bgcolor: 'rgba(1, 72, 131, 0.16)',
                      }
                    },
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateX(4px)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: isSelected ? 'primary.main' : 'text.secondary',
                    minWidth: 40,
                    transition: 'color 0.2s',
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ 
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'primary.main' : 'text.primary',
                    }}
                    sx={{ transition: 'color 0.2s' }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
      <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={1.1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 22, height: 22, position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
              <Image src="/logo.png" alt="EduGen logo" fill sizes="22px" />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              EduGen
            </Typography>
          </Box>
          <Link href="mailto:bilinski.piotr89@gmail.com" underline="hover" color="text.secondary" variant="caption">
            bilinski.piotr89@gmail.com
          </Link>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.5 }}>
            {`${process.env.NEXT_PUBLIC_APP_NAME ?? 'EduGen'}_${process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.1'}_${process.env.NEXT_PUBLIC_APP_RELEASE_DATE ?? '2026-03-11'}`}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            borderRight: '1px solid',
            borderColor: 'rgba(0,0,0,0.05)',
            bgcolor: 'background.paper',
            boxShadow: '2px 0 16px rgba(0,0,0,0.02)',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
