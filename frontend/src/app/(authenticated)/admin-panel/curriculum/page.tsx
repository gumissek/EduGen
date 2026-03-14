'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { CurriculumDocument } from '@/types';

interface CurriculumDocumentsResponse {
  documents: CurriculumDocument[];
  total: number;
}

const STATUS_CHIP_PROPS: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' }> = {
  uploaded: { label: 'Wgrano', color: 'default' },
  processing: { label: 'Przetwarzanie...', color: 'warning' },
  ready: { label: 'Gotowy', color: 'success' },
  error: { label: 'Błąd', color: 'error' },
};

export default function AdminCurriculumPage() {
  const { isLoading: isAuthLoading, isAuthorized } = useAdminAccess();
  const { success, error: showError } = useSnackbar();
  const queryClient = useQueryClient();

  const [file, setFile] = React.useState<File | null>(null);
  const [educationLevel, setEducationLevel] = React.useState('');
  const [subjectName, setSubjectName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const { data, isLoading } = useQuery<CurriculumDocumentsResponse>({
    queryKey: ['admin-curriculum-documents'],
    queryFn: async () => {
      // Admin sees ALL documents, not just ready ones — use status polling
      const res = await api.get('/api/curriculum/documents');
      return res.data;
    },
    refetchInterval: (query) => {
      const docs = query.state.data?.documents ?? [];
      const hasProcessing = docs.some((d: CurriculumDocument) => d.status === 'processing' || d.status === 'uploaded');
      return hasProcessing ? 3000 : false;
    },
  });

  const documents = data?.documents ?? [];

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Wybierz plik');
      const formData = new FormData();
      formData.append('file', file);
      if (educationLevel) formData.append('education_level', educationLevel);
      if (subjectName) formData.append('subject_name', subjectName);
      if (description) formData.append('description', description);
      const res = await api.post('/api/curriculum/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      });
      return res.data;
    },
    onSuccess: () => {
      success('Dokument wgrany i rozpoczęto przetwarzanie');
      setFile(null);
      setEducationLevel('');
      setSubjectName('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['admin-curriculum-documents'] });
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      showError(axiosErr.response?.data?.detail ?? 'Błąd podczas wgrywania dokumentu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/api/curriculum/documents/${docId}`);
    },
    onSuccess: () => {
      success('Dokument usunięty');
      queryClient.invalidateQueries({ queryKey: ['admin-curriculum-documents'] });
    },
    onError: () => {
      showError('Błąd podczas usuwania dokumentu');
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: async (docId: string) => {
      await api.post(`/api/curriculum/documents/${docId}/reprocess`);
    },
    onSuccess: () => {
      success('Ponowne przetwarzanie rozpoczęte');
      queryClient.invalidateQueries({ queryKey: ['admin-curriculum-documents'] });
    },
    onError: () => {
      showError('Błąd podczas ponownego przetwarzania');
    },
  });

  if (isAuthLoading) {
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
          Nie masz uprawnień do zarządzania Podstawą Programową.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        Zarządzanie Podstawą Programową
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Wgraj dokumenty PDF Podstawy Programowej. System automatycznie przetworzy je do bazy wektorowej.
      </Typography>

      {/* Upload section */}
      <Card variant="outlined" sx={{ mb: 4, p: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Wgraj nowy dokument
          </Typography>
          <Stack spacing={2}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
            >
              {file ? file.name : 'Wybierz plik PDF'}
              <input
                type="file"
                accept=".pdf"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Poziom edukacji"
                size="small"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                placeholder="np. szkoła podstawowa"
              />
              <TextField
                label="Przedmiot"
                size="small"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="np. Matematyka"
              />
            </Stack>
            <TextField
              label="Opis (opcjonalny)"
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
            />
            <Button
              variant="contained"
              onClick={() => uploadMutation.mutate()}
              disabled={!file || uploadMutation.isPending}
              startIcon={uploadMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
              sx={{ alignSelf: 'flex-start' }}
            >
              {uploadMutation.isPending ? 'Wgrywanie...' : 'Wgraj dokument'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Documents table */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Wgrane dokumenty
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Alert severity="info">Brak wgranych dokumentów Podstawy Programowej.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nazwa pliku</TableCell>
                <TableCell>Poziom</TableCell>
                <TableCell>Przedmiot</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Fragmenty</TableCell>
                <TableCell align="right">Data</TableCell>
                <TableCell align="center">Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => {
                const statusProps = STATUS_CHIP_PROPS[doc.status] ?? { label: doc.status, color: 'default' as const };
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Tooltip title={doc.original_filename}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {doc.original_filename}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{doc.education_level ?? '-'}</TableCell>
                    <TableCell>{doc.subject_name ?? '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={statusProps.label}
                        size="small"
                        color={statusProps.color}
                        icon={doc.status === 'processing' ? <CircularProgress size={12} /> : undefined}
                      />
                      {doc.status === 'error' && doc.error_message && (
                        <Tooltip title={doc.error_message}>
                          <Typography variant="caption" color="error" display="block">
                            {doc.error_message.substring(0, 50)}...
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">{doc.chunk_count}</TableCell>
                    <TableCell align="right">
                      {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Przetwórz ponownie">
                        <IconButton
                          size="small"
                          onClick={() => reprocessMutation.mutate(doc.id)}
                          disabled={doc.status === 'processing'}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Usuń">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (confirm('Czy na pewno chcesz usunąć ten dokument?')) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
