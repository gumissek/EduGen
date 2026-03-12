'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import RestoreIcon from '@mui/icons-material/Restore';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface BackupItem {
  id: string;
  backup_path: string;
  size_bytes: number;
  created_at: string;
  expires_at: string;
}

interface BackupListResponse {
  backups: BackupItem[];
}

export default function AdminDatabasePage() {
  const queryClient = useQueryClient();
  const { success, error } = useSnackbar();
  const { isLoading: isCheckingAccess, isAuthorized } = useAdminAccess();
  const [restoreBackupId, setRestoreBackupId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-backups'],
    queryFn: async () => {
      const res = await api.get<BackupListResponse>('/api/backups');
      return res.data;
    },
    enabled: isAuthorized,
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/backups');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
      success('Utworzono backup bazy danych');
    },
    onError: () => error('Nie udało się utworzyć backupu'),
  });

  const restoreMutation = useMutation({
    mutationFn: async (backupId: string) => {
      await api.post('/api/backups/restore', null, { params: { backup_id: backupId } });
    },
    onSuccess: () => {
      success('Przywrócono backup bazy danych');
      setRestoreBackupId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
    },
    onError: () => error('Nie udało się przywrócić backupu'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/api/backups/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
      success('Backup został wgrany');
    },
    onError: () => error('Nie udało się wgrać backupu'),
  });

  const handleDownload = async (backupId: string) => {
    try {
      const response = await api.get(`/api/backups/${backupId}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `backup_${backupId}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      success('Pobrano backup');
    } catch {
      error('Nie udało się pobrać backupu');
    }
  };

  const backups = data?.backups ?? [];

  if (isCheckingAccess || (isLoading && isAuthorized)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthorized) {
    return <Alert severity="error">Brak uprawnień administratora do zarządzania backupami.</Alert>;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Kopie bazy danych
        </Typography>
        <Tooltip title="Odśwież">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => createBackupMutation.mutate()}>
            Utwórz pełny zrzut bazy
          </Button>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
            Wgraj backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              event.currentTarget.value = '';
            }}
          />
        </Stack>
      </Paper>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Nie udało się pobrać listy backupów.
        </Alert>
      )}

      <Paper variant="outlined">
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Plik</TableCell>
                <TableCell>Rozmiar (B)</TableCell>
                <TableCell>Utworzono</TableCell>
                <TableCell>Wygasa</TableCell>
                <TableCell align="right">Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    Brak backupów
                  </TableCell>
                </TableRow>
              ) : backups.map((backup) => (
                <TableRow key={backup.id} hover>
                  <TableCell>{backup.backup_path.split(/[\\/]/).pop()}</TableCell>
                  <TableCell>{backup.size_bytes}</TableCell>
                  <TableCell>{new Date(backup.created_at).toLocaleString('pl-PL')}</TableCell>
                  <TableCell>{new Date(backup.expires_at).toLocaleString('pl-PL')}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Pobierz backup">
                        <IconButton size="small" onClick={() => handleDownload(backup.id)}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Przywróć backup">
                        <IconButton size="small" color="warning" onClick={() => setRestoreBackupId(backup.id)}>
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ConfirmDialog
        open={!!restoreBackupId}
        title="Przywróć backup"
        message="Czy na pewno chcesz przywrócić bazę danych z wybranego backupu?"
        confirmLabel="Przywróć"
        severity="warning"
        isLoading={restoreMutation.isPending}
        onCancel={() => setRestoreBackupId(null)}
        onConfirm={() => {
          if (restoreBackupId) {
            restoreMutation.mutate(restoreBackupId);
          }
        }}
      />
    </Box>
  );
}
