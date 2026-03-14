'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Grid2 from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import BugReportIcon from '@mui/icons-material/BugReport';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import { useRouter } from 'next/navigation';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface AdminTile {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string | null; // null = coming soon
  enabled: boolean;
}

const adminTiles: AdminTile[] = [
  {
    title: 'Diagnostyka',
    description: 'Przegląd logów diagnostycznych i błędów systemowych.',
    icon: <BugReportIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
    path: '/diagnostics',
    enabled: true,
  },
  {
    title: 'Zarządzanie użytkownikami',
    description: 'Przegląd i zarządzanie kontami użytkowników.',
    icon: <PeopleIcon sx={{ fontSize: 48, color: 'info.main' }} />,
    path: '/admin-panel/users',
    enabled: true,
  },
  {
    title: 'Kopie bazy danych',
    description: 'Pełny zrzut bazy: utwórz, pobierz, uploaduj i przywróć.',
    icon: <StorageIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
    path: '/admin-panel/database',
    enabled: true,
  },
  {
    title: 'Statystyki',
    description: 'Przegląd statystyk systemowych i wykorzystania API.',
    icon: <BarChartIcon sx={{ fontSize: 48, color: 'success.main' }} />,
    path: null,
    enabled: false,
  },
  {
    title: 'Bezpieczeństwo',
    description: 'Zarządzanie uprawnieniami i politykami bezpieczeństwa.',
    icon: <SecurityIcon sx={{ fontSize: 48, color: 'error.main' }} />,
    path: null,
    enabled: false,
  },
];

export default function AdminPanelPage() {
  const router = useRouter();
  const { isLoading, isAuthorized } = useAdminAccess();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthorized) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          Nie masz uprawnień do panelu administracyjnego. Ta strona jest dostępna tylko dla administratorów.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        Panel administracyjny
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Zarządzaj systemem EduGen. Wybierz jedną z poniższych sekcji.
      </Typography>

      <Grid2 container spacing={3}>
        {adminTiles.map((tile) => (
          <Grid2  size={{xs:12, sm:6, md:4}} key={tile.title}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                opacity: tile.enabled ? 1 : 0.5,
                transition: 'all 0.2s',
                '&:hover': tile.enabled ? { boxShadow: 4, transform: 'translateY(-2px)' } : {},
              }}
            >
              <CardActionArea
                disabled={!tile.enabled}
                onClick={() => tile.path && router.push(tile.path)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>{tile.icon}</Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {tile.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tile.description}
                  </Typography>
                  {!tile.enabled && (
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                      Wkrótce dostępne
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid2>
        ))}
      </Grid2>
    </Box>
  );
}
