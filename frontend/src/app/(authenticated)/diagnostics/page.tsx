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
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/lib/api';

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

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          Diagnostyka
        </Typography>
        <Tooltip title="Odśwież">
          <IconButton onClick={() => refetch()} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={levelFilter}
          exclusive
          onChange={handleLevelChange}
          size="small"
        >
          <ToggleButton value="">Wszystkie</ToggleButton>
          <ToggleButton value="info">Info</ToggleButton>
          <ToggleButton value="warning">Ostrzeżenia</ToggleButton>
          <ToggleButton value="error">Błędy</ToggleButton>
        </ToggleButtonGroup>
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
            <TableContainer sx={{ flexGrow: 1 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={140}>Data i czas</TableCell>
                    <TableCell width={130}>Poziom</TableCell>
                    <TableCell>Wiadomość</TableCell>
                    <TableCell width={200}>Metadane</TableCell>
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
                      const chip = LEVEL_CHIP[log.level] ?? LEVEL_CHIP.info;
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
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary', wordBreak: 'break-word' }}>
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
