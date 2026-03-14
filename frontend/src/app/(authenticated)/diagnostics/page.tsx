'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import Button from '@mui/material/Button';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/lib/api';
import AlertTitle from '@mui/material/AlertTitle';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface DiagnosticLog {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata_json: string | null;
  created_at: string;
}

interface DiagnosticListResponse {
  logs: DiagnosticLog[];
  total: number;
  page: number;
  per_page: number;
}

const LEVEL_CHIP: Record<string, { label: string; color: 'default' | 'warning' | 'error' }> = {
  info: { label: 'INFO', color: 'default' },
  warning: { label: 'OSTRZEŻENIE', color: 'warning' },
  error: { label: 'BŁĄD', color: 'error' },
};

export default function DiagnosticsPage() {
  const { isLoading: isCheckingAccess, isAuthorized } = useAdminAccess();
  const [levelFilter, setLevelFilter] = React.useState<string>('');
  const [page, setPage] = React.useState(0);
  const perPage = 50;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['diagnostics', levelFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (levelFilter) params.set('level', levelFilter);
      params.set('page', String(page + 1));
      params.set('per_page', String(perPage));
      const res = await api.get<DiagnosticListResponse>(`/api/diagnostics/logs?${params.toString()}`);
      return res.data;
    },
    enabled: isAuthorized,
    refetchInterval: 30_000, // auto-refresh every 30 s
    refetchIntervalInBackground: false,
  });

  const handleLevelChange = (_: React.MouseEvent<HTMLElement>, value: string | null) => {
    setLevelFilter(value ?? '');
    setPage(0);
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const logs: DiagnosticLog[] = data?.logs ?? [];
  const total = data?.total ?? 0;

  const handleDownloadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (levelFilter) params.set('level', levelFilter);
      const response = await api.get(`/api/diagnostics/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `diagnostic_logs${levelFilter ? `_${levelFilter}` : ''}.jsonl`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // kept silent on purpose to avoid extra dependency on snackbar provider in admin pages
    }
  };

  if (isCheckingAccess) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthorized) {
    return (
      <Alert severity="error">
        <AlertTitle>Brak dostępu</AlertTitle>
        Ta sekcja jest dostępna wyłącznie dla administratora.
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Diagnostyka
        </Typography>
        <Tooltip title="Odśwież">
          <IconButton onClick={() => refetch()} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ mb: { xs: 3, sm: 2 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
        <ToggleButtonGroup
          value={levelFilter}
          exclusive
          onChange={handleLevelChange}
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="">Wszystkie</ToggleButton>
          <ToggleButton value="info">Info</ToggleButton>
          <ToggleButton value="warning">Ostrzeżenia</ToggleButton>
          <ToggleButton value="error">Błędy</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadLogs}>
          Pobierz logi
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Nie udało się załadować logów diagnostycznych.
        </Alert>
      )}

      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ flexGrow: 1, overflowX: 'auto' }}>
              <Table stickyHeader size="small" sx={{ minWidth: { xs: 480, sm: 'auto' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell width={140}>Data i czas</TableCell>
                    <TableCell width={130}>Poziom</TableCell>
                    <TableCell>Wiadomość</TableCell>
                    <TableCell width={200} sx={{ display: { xs: 'none', md: 'table-cell' } }}>Metadane</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary" variant="body2">
                          Brak logów do wyświetlenia.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const levelKey = String(log.level || '').toLowerCase();
                      const chip = LEVEL_CHIP[levelKey] ?? LEVEL_CHIP.info;
                      return (
                        <TableRow key={log.id} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'text.secondary' }}>
                            {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Chip label={chip.label} color={chip.color} size="small" />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-word' }}>
                            {log.message}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', wordBreak: 'break-word', display: { xs: 'none', md: 'table-cell' } }}>
                            {log.metadata_json ?? '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={perPage}
              rowsPerPageOptions={[perPage]}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} z ${count}`}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
