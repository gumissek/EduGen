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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import BarChartIcon from '@mui/icons-material/BarChart';
import SaveIcon from '@mui/icons-material/Save';
import EmailIcon from '@mui/icons-material/Email';
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

  // Email change modal state
  const [emailModalOpen, setEmailModalOpen] = React.useState(false);
  const [emailModalPassword, setEmailModalPassword] = React.useState('');
  const [emailModalError, setEmailModalError] = React.useState('');
  // Populated when backend is in local mode (email not sent) — shows the verification link inline
  const [emailLocalLink, setEmailLocalLink] = React.useState<string | null>(null);

  // Password verification code modal state
  const [passwordCodeModalOpen, setPasswordCodeModalOpen] = React.useState(false);
  const [verificationCode, setVerificationCode] = React.useState('');
  const [passwordCodeError, setPasswordCodeError] = React.useState('');

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
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // odświezanie statystyk tylko ręcznie, po zmianach w profilu (np. email) lub po odświeżeniu strony
  });

  const refreshStats = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
  }, [queryClient]);

  // Profile update mutation (name only — email change goes through verification)
  const profileMutation = useMutation({
    mutationFn: async () => {
      await api.put('/api/auth/me', {
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

  interface EmailChangeApiResponse {
    detail: string;
    email_sent: boolean;
    verification_link: string | null;
  }

  // Email change request mutation
  const emailChangeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<EmailChangeApiResponse>('/api/auth/me/request-email-change', {
        new_email: email,
        password: emailModalPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setEmailModalPassword('');
      setEmailModalError('');
      if (data.email_sent) {
        setEmailModalOpen(false);
        setEmailLocalLink(null);
        refreshStats();
        success('Link weryfikacyjny został wysłany na nowy adres e-mail (ważny 24h). Sprawdź skrzynkę pocztową.');
      } else {
        // Local / dev mode — email provider not configured
        setEmailLocalLink(data.verification_link);
      }
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setEmailModalError(detail ?? 'Nie udało się wysłać linku weryfikacyjnego. Sprawdź konfigurację serwera e-mail.');
    },
  });

  // Password change request mutation (sends code)
  const passwordRequestMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/me/request-password-change', {
        current_password: currentPassword,
        new_password: newPassword,
      });
    },
    onSuccess: () => {
      setPasswordError('');
      setPasswordCodeModalOpen(true);
      success('Kod weryfikacyjny został wysłany na Twój adres e-mail (ważny 5 minut)');
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPasswordError(detail ?? 'Nie udało się wysłać kodu weryfikacyjnego');
    },
  });

  // Password change confirmation mutation (verifies code)
  const passwordConfirmMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/me/confirm-password-change', {
        code: verificationCode,
        new_password: newPassword,
      });
    },
    onSuccess: () => {
      setPasswordCodeModalOpen(false);
      setVerificationCode('');
      setPasswordCodeError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      refreshStats();
      success('Hasło zostało pomyślnie zmienione');
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPasswordCodeError(detail ?? 'Nieprawidłowy kod weryfikacyjny');
    },
  });

  const emailChanged = user ? email !== user.email : false;

  const handleProfileSave = () => {
    if (!email.trim()) {
      error('Adres e-mail nie może być pusty');
      return;
    }

    // If email was changed, open the verification modal
    if (emailChanged) {
      setEmailModalError('');
      setEmailModalPassword('');
      setEmailModalOpen(true);
      return;
    }

    // Otherwise just save name changes
    profileMutation.mutate();
  };

  const handleEmailChangeConfirm = () => {
    if (!emailModalPassword) {
      setEmailModalError('Podaj hasło, aby potwierdzić zmianę adresu e-mail');
      return;
    }
    emailChangeMutation.mutate();
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
    passwordRequestMutation.mutate();
  };

  const handlePasswordCodeConfirm = () => {
    if (!verificationCode.trim()) {
      setPasswordCodeError('Podaj kod weryfikacyjny');
      return;
    }
    passwordConfirmMutation.mutate();
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
            Twoje Dane
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
                {user.api_quota_reset && (
                  <> &nbsp;·&nbsp; Reset quota: <strong>{new Date(user.api_quota_reset).toLocaleDateString('pl-PL')}</strong></>
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
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input type="text" name="username" autoComplete="username" value={user?.email ?? ''} readOnly style={{ display: 'none' }} />
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
              type="submit"
              variant="outlined"
              color="warning"
              startIcon={passwordRequestMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
              disabled={passwordRequestMutation.isPending || !currentPassword || !newPassword || !confirmPassword || passwordCodeModalOpen}
            >
              Zmień hasło
            </Button>
          </Box>
          {passwordCodeModalOpen && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                Na Twój adres e-mail (<strong>{user?.email}</strong>) został wysłany 6-cyfrowy kod weryfikacyjny.
                Wpisz go poniżej, aby potwierdzić zmianę hasła. Kod jest ważny 5 minut.
              </Typography>
              <TextField
                label="Kod weryfikacyjny (6 cyfr)"
                value={verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(val);
                }}
                fullWidth
                inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                placeholder="000000"
              />
              {passwordCodeError && (
                <Alert severity="error">
                  {passwordCodeError}
                </Alert>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button onClick={() => { setPasswordCodeModalOpen(false); setPasswordCodeError(''); setVerificationCode(''); }}>
                  Anuluj
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handlePasswordCodeConfirm}
                  disabled={passwordConfirmMutation.isPending || verificationCode.length !== 6}
                  startIcon={passwordConfirmMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                >
                  Potwierdź zmianę hasła
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Email change verification modal ── */}
      <Dialog
        open={emailModalOpen}
        onClose={() => { setEmailModalOpen(false); setEmailModalError(''); setEmailLocalLink(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color={emailLocalLink ? 'warning' : 'primary'} />
          {emailLocalLink ? 'Wysłanie e-maila nieobsługiwane (tryb lokalny)' : 'Potwierdź zmianę adresu e-mail'}
        </DialogTitle>
        <DialogContent>
          {emailLocalLink ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Tryb lokalny — łączność z serwerem e-mail nie jest skonfigurowana.</strong><br />
                W wersji produkcyjnej link weryfikacyjny zostanie wysłany na adres{' '}
                <strong>{email}</strong>. Skonfiguruj serwer SMTP lub dostawcę e-mail przed wdrożeniem.
              </Alert>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Możesz skorzystać z poniższego linku weryfikacyjnego bezpośrednio (ważny 24h):
              </Typography>
              <Box
                component="a"
                href={typeof window !== 'undefined' ? window.location.origin + emailLocalLink : emailLocalLink}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'block',
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  wordBreak: 'break-all',
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {typeof window !== 'undefined' ? window.location.origin + emailLocalLink : emailLocalLink}
              </Box>
            </>
          ) : (
            <Box
              component="form"
              id="email-change-form"
              onSubmit={(e) => { e.preventDefault(); handleEmailChangeConfirm(); }}
            >
              <input type="text" name="username" autoComplete="username" value={user?.email ?? ''} readOnly style={{ display: 'none' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Aby zmienić adres e-mail na <strong>{email}</strong>, podaj swoje obecne hasło.
                Na nowy adres zostanie wysłany link weryfikacyjny ważny 24 godziny.
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Po kliknięciu linku weryfikacyjnego zostaniesz wylogowany i będziesz musiał zalogować się ponownie
                przy użyciu nowego adresu e-mail.
              </Alert>
              <TextField
                label="Obecne hasło"
                type="password"
                value={emailModalPassword}
                onChange={(e) => setEmailModalPassword(e.target.value)}
                fullWidth
                autoComplete="current-password"
                autoFocus
              />
              {emailModalError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {emailModalError}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setEmailModalOpen(false); setEmailModalError(''); setEmailLocalLink(null); }}>
            {emailLocalLink ? 'Zamknij' : 'Anuluj'}
          </Button>
          {!emailLocalLink && (
            <Button
              type="submit"
              form="email-change-form"
              variant="contained"
              disabled={emailChangeMutation.isPending || !emailModalPassword}
              startIcon={emailChangeMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <EmailIcon />}
            >
              Wyślij link weryfikacyjny
            </Button>
          )}
        </DialogActions>
      </Dialog>


    </Box>
  );
}
