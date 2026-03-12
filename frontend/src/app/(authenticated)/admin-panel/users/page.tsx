'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  premium_level: number;
  api_quota: number;
  default_model: string;
  created_at: string;
  updated_at: string;
}

interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
}

interface UserUpdatePayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  premium_level?: number;
  api_quota?: number;
  default_model?: string;
}

const perPage = 20;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();
  const { isLoading: isCheckingAccess, isAuthorized } = useAdminAccess();

  const [page, setPage] = React.useState(0);
  const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(null);
  const [deleteUserId, setDeleteUserId] = React.useState<string | null>(null);
  const [resetUserId, setResetUserId] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('per_page', String(perPage));
      const res = await api.get<AdminUserListResponse>(`/api/admin/users?${params.toString()}`);
      return res.data;
    },
    enabled: isAuthorized,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, payload }: { userId: string; payload: UserUpdatePayload }) => {
      await api.put(`/api/admin/users/${userId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      success('Użytkownik został zaktualizowany');
      setSelectedUser(null);
    },
    onError: () => error('Nie udało się zaktualizować użytkownika'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      success('Użytkownik został usunięty');
      setDeleteUserId(null);
    },
    onError: () => error('Nie udało się usunąć użytkownika'),
  });

  const resetMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      await api.post(`/api/admin/users/${userId}/reset-password`, { new_password: password });
    },
    onSuccess: () => {
      success('Hasło zostało zresetowane');
      setResetUserId(null);
      setNewPassword('');
    },
    onError: () => error('Nie udało się zresetować hasła'),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  if (isCheckingAccess || (isLoading && isAuthorized)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthorized) {
    return (
      <Alert severity="error">
        Brak uprawnień administratora do zarządzania użytkownikami.
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Zarządzanie użytkownikami
        </Typography>
        <Tooltip title="Odśwież listę">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Nie udało się pobrać listy użytkowników.
        </Alert>
      )}

      <Paper variant="outlined">
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 860 }}>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Imię</TableCell>
                <TableCell>Nazwisko</TableCell>
                <TableCell>Rola</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Quota</TableCell>
                <TableCell align="right">Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    Brak użytkowników
                  </TableCell>
                </TableRow>
              ) : users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.first_name ?? '—'}</TableCell>
                  <TableCell>{user.last_name ?? '—'}</TableCell>
                  <TableCell>{user.is_superuser ? 'admin' : 'user'}</TableCell>
                  <TableCell>{user.is_active ? 'aktywny' : 'zablokowany'}</TableCell>
                  <TableCell>{user.api_quota}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edytuj">
                        <IconButton size="small" onClick={() => setSelectedUser(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset hasła">
                        <IconButton size="small" color="warning" onClick={() => setResetUserId(user.id)}>
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Usuń">
                        <IconButton size="small" color="error" onClick={() => setDeleteUserId(user.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={perPage}
          rowsPerPageOptions={[perPage]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} z ${count}`}
        />
      </Paper>

      <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edytuj użytkownika</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
              <TextField
                label="Email"
                value={selectedUser.email}
                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                fullWidth
              />
              <TextField
                label="Imię"
                value={selectedUser.first_name ?? ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, first_name: e.target.value })}
                fullWidth
              />
              <TextField
                label="Nazwisko"
                value={selectedUser.last_name ?? ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, last_name: e.target.value })}
                fullWidth
              />
              <TextField
                label="Poziom premium"
                type="number"
                value={selectedUser.premium_level}
                onChange={(e) => setSelectedUser({ ...selectedUser, premium_level: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="API quota"
                type="number"
                value={selectedUser.api_quota}
                onChange={(e) => setSelectedUser({ ...selectedUser, api_quota: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Domyślny model"
                value={selectedUser.default_model}
                onChange={(e) => setSelectedUser({ ...selectedUser, default_model: e.target.value })}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedUser.is_active}
                    onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.checked })}
                  />
                }
                label="Konto aktywne"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedUser.is_superuser}
                    onChange={(e) => setSelectedUser({ ...selectedUser, is_superuser: e.target.checked })}
                  />
                }
                label="Superuser"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedUser(null)}>Anuluj</Button>
          <Button
            variant="contained"
            disabled={!selectedUser || updateMutation.isPending}
            onClick={() => {
              if (!selectedUser) return;
              updateMutation.mutate({
                userId: selectedUser.id,
                payload: {
                  email: selectedUser.email,
                  first_name: selectedUser.first_name ?? '',
                  last_name: selectedUser.last_name ?? '',
                  is_active: selectedUser.is_active,
                  is_superuser: selectedUser.is_superuser,
                  premium_level: selectedUser.premium_level,
                  api_quota: selectedUser.api_quota,
                  default_model: selectedUser.default_model,
                },
              });
            }}
          >
            Zapisz
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!resetUserId} onClose={() => { setResetUserId(null); setNewPassword(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>Reset hasła użytkownika</DialogTitle>
        <DialogContent>
          <TextField
            label="Nowe hasło"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setResetUserId(null); setNewPassword(''); }}>Anuluj</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!resetUserId || newPassword.length < 8 || resetMutation.isPending}
            onClick={() => {
              if (!resetUserId) return;
              resetMutation.mutate({ userId: resetUserId, password: newPassword });
            }}
          >
            Resetuj hasło
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteUserId}
        title="Usuń użytkownika"
        message="Czy na pewno chcesz usunąć użytkownika? Operacja jest nieodwracalna."
        confirmLabel="Usuń"
        severity="error"
        isLoading={deleteMutation.isPending}
        onCancel={() => setDeleteUserId(null)}
        onConfirm={() => {
          if (deleteUserId) {
            deleteMutation.mutate(deleteUserId);
          }
        }}
      />
    </Box>
  );
}
