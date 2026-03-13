'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Grid2 from '@mui/material/Grid2';
import Skeleton from '@mui/material/Skeleton';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import BarChartIcon from '@mui/icons-material/BarChart';
import SaveIcon from '@mui/icons-material/Save';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

interface UserStatsResponse {
  documents_count: number;
  ai_requests_count: number;
  generations_count: number;
  failed_generations_count: number;
}

interface StatCardProps {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  color?: string;
}

function StatCard({ label, value, isLoading, color = 'primary.main' }: StatCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: { xs: '12px', sm: '16px' },
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        height: { xs: 110, sm: 130 },
      }}
    >
      {isLoading ? (
        <Skeleton variant="text" width={60} height={48} />
      ) : (
        <Typography variant="h3" fontWeight={800} color={color} sx={{ fontSize: { xs: '2rem', sm: '3rem' }, lineHeight: 1 }}>
          {value ?? 0}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { success, error } = useSnackbar();

  // Profile form state
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');

  // Populate form when user data loads
  React.useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
      setEmail(user.email);
    }
  }, [user]);

  // Stats query
  const { data: stats, isLoading: isStatsLoading } = useQuery<UserStatsResponse>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const res = await api.get<UserStatsResponse>('/api/auth/me/stats');
      return res.data;
    },
  });

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async () => {
      await api.put('/api/auth/me', {
        email: email || undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
      success('Dane profilu zostały zaktualizowane');
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      error(detail ?? 'Nie udało się zaktualizować profilu');
    },
  });

  // Password change mutation
  const passwordMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/me/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
    },
    onSuccess: () => {
      success('Hasło zostało zmienione');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      error(detail ?? 'Nie udało się zmienić hasła');
    },
  });

  const handleProfileSave = () => {
    if (!email.trim()) {
      error('Adres e-mail nie może być pusty');
      return;
    }
    profileMutation.mutate();
  };

  const handlePasswordChange = () => {
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Podaj obecne hasło');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Nowe hasła nie są zgodne');
      return;
    }
    passwordMutation.mutate();
  };

  const sectionHeaderSx = {
    p: { xs: 2, sm: 4 },
    mb: { xs: 2, sm: 3 },
    borderRadius: { xs: '16px', sm: '24px' },
    borderColor: 'divider',
    boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
  };

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Typography
          variant="h4"
          fontWeight="800"
          gutterBottom
          sx={{ fontSize: { xs: '1.4rem', sm: '2rem', md: '2.125rem' } }}
        >
          Mój profil
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          Zarządzaj swoimi danymi, hasłem i przeglądaj statystyki.
        </Typography>
      </Box>

      {/* ── Stats ── */}
      <Paper variant="outlined" sx={sectionHeaderSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'success.main', color: 'success.contrastText', display: 'flex' }}>
            <BarChartIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Twoje statystyki
          </Typography>
        </Box>
        <Divider sx={{ mb: { xs: 2, sm: 3 } }} />
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <StatCard label="Gotowe materiały" value={stats?.documents_count} isLoading={isStatsLoading} />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <StatCard label="Liczba generacji" value={stats?.generations_count} isLoading={isStatsLoading} />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <StatCard label="Zapytania do AI" value={stats?.ai_requests_count} isLoading={isStatsLoading} />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 3 }}>
            <StatCard label="Błędy generowania" value={stats?.failed_generations_count} isLoading={isStatsLoading} color="error.main" />
          </Grid2>
        </Grid2>
      </Paper>

      {/* ── Profile data ── */}
      <Paper variant="outlined" sx={sectionHeaderSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex' }}>
            <PersonIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Dane osobowe
          </Typography>
        </Box>
        <Divider sx={{ mb: { xs: 2, sm: 3 } }} />

        {isUserLoading ? (
          <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={56} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Imię"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  fullWidth
                  inputProps={{ maxLength: 255 }}
                />
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Nazwisko"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  fullWidth
                  inputProps={{ maxLength: 255 }}
                />
              </Grid2>
            </Grid2>
            <TextField
              label="Adres e-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 255 }}
            />
            {user && (
              <Typography variant="caption" color="text.secondary">
                Konto utworzone: {new Date(user.created_at).toLocaleDateString('pl-PL')}
                {user.api_quota !== undefined && (
                  <> &nbsp;·&nbsp; Quota API: <strong>{user.api_quota}</strong></>
                )}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={profileMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleProfileSave}
                disabled={profileMutation.isPending}
              >
                Zapisz dane
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* ── Change password ── */}
      <Paper variant="outlined" sx={sectionHeaderSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'warning.main', color: 'warning.contrastText', display: 'flex' }}>
            <LockIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Zmiana hasła
          </Typography>
        </Box>
        <Divider sx={{ mb: { xs: 2, sm: 3 } }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Obecne hasło"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            autoComplete="current-password"
          />
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Nowe hasło"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                autoComplete="new-password"
                helperText="Minimum 8 znaków"
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Powtórz nowe hasło"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                autoComplete="new-password"
                error={!!confirmPassword && confirmPassword !== newPassword}
                helperText={!!confirmPassword && confirmPassword !== newPassword ? 'Hasła nie pasują' : ' '}
              />
            </Grid2>
          </Grid2>
          {passwordError && (
            <Alert severity="error" sx={{ mt: -1 }}>
              {passwordError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={passwordMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
              onClick={handlePasswordChange}
              disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            >
              Zmień hasło
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
