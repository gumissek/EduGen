'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <TopBar onMenuClick={handleDrawerToggle} />
      <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} />
      
      <Box
        component="main"
        className="animate-fade-in"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 5 },
          width: { sm: `calc(100% - 260px)` },
          overflowY: 'auto',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          backgroundImage: (theme) => theme.palette.mode === 'light' 
              ? 'radial-gradient(circle at top right, rgba(1, 72, 131, 0.04), transparent 500px), radial-gradient(circle at bottom left, rgba(1, 72, 131, 0.02), transparent 500px)'
              : 'radial-gradient(circle at top right, rgba(47, 110, 163, 0.06), transparent 500px), radial-gradient(circle at bottom left, rgba(47, 110, 163, 0.03), transparent 500px)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 70 }, mb: { xs: 1, sm: 2 } }} /> {/* Spacer for TopBar */}
        <Box sx={{ maxWidth: 1440, width: '100%', mx: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
