'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { alpha, useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import CurriculumDocumentRow from '@/components/curriculum/CurriculumDocumentRow';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { CurriculumDocument } from '@/types';

interface CurriculumDocumentsResponse {
  documents: CurriculumDocument[];
  total: number;
}

const MAX_CURRICULUM_PDF_SIZE_BYTES = 50 * 1024 * 1024;

function getApiErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: {
      data?: {
        detail?: string | Array<{ msg?: string }> | Record<string, unknown>;
      };
    };
    message?: string;
  };

  const detail = axiosErr.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const firstMsg = detail.find((item) => typeof item?.msg === 'string')?.msg;
    if (firstMsg) {
      return firstMsg;
    }
  }

  if (axiosErr.message) {
    return axiosErr.message;
  }

  return fallback;
}

export default function AdminCurriculumPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { isLoading: isAuthLoading, isAuthorized } = useAdminAccess();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { success, error: showError } = useSnackbar();
  const queryClient = useQueryClient();

  const [file, setFile] = React.useState<File | null>(null);
  const [educationLevel, setEducationLevel] = React.useState('');
  const [subjectName, setSubjectName] = React.useState('');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const [curriculumYear, setCurriculumYear] = React.useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const hasSecretKeys = Boolean(user?.has_secret_keys);

  const { data, isLoading } = useQuery<CurriculumDocumentsResponse>({
    queryKey: ['admin-curriculum-documents'],
    queryFn: async () => {
      // Admin sees ALL documents via dedicated admin endpoint.
      const res = await api.get('/api/curriculum/documents/admin');
      return res.data;
    },
    refetchInterval: (query) => {
      const docs = query.state.data?.documents ?? [];
      const hasProcessing = docs.some((d: CurriculumDocument) => d.status === 'processing' || d.status === 'uploaded');
      return hasProcessing ? 3000 : false;
    },
  });

  const documents = data?.documents ?? [];

  const handleDownload = React.useCallback((docId: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/curriculum/documents/${docId}/download`;
    link.download = filename;
    link.click();
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Wybierz plik');
      if (!hasSecretKeys) {
        throw new Error('Brak aktywnego klucza API OpenRouter. Dodaj klucz w Ustawieniach.');
      }

      const trimmedEducationLevel = educationLevel.trim();
      const trimmedSubjectName = subjectName.trim();
      const trimmedSourceUrl = sourceUrl.trim();
      const trimmedCurriculumYear = curriculumYear.trim();

      if (!trimmedEducationLevel) {
        throw new Error('Pole "Poziom edukacji" jest wymagane.');
      }
      if (!trimmedSubjectName) {
        throw new Error('Pole "Przedmiot" jest wymagane.');
      }
      if (!trimmedSourceUrl) {
        throw new Error('Pole "Link do źródła" jest wymagane.');
      }

      if (!trimmedCurriculumYear) {
        throw new Error('Pole "Rok podstawy programowej" jest wymagane.');
      }

      let parsedSourceUrl: URL;
      try {
        parsedSourceUrl = new URL(trimmedSourceUrl);
      } catch {
        throw new Error('Podaj poprawny link do źródła (http:// lub https://).');
      }

      if (!['http:', 'https:'].includes(parsedSourceUrl.protocol)) {
        throw new Error('Link do źródła musi zaczynać się od http:// lub https://.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('education_level', trimmedEducationLevel);
      formData.append('subject_name', trimmedSubjectName);
      // Backend stores this field in "description", so we keep the API key name.
      formData.append('description', trimmedSourceUrl);
      formData.append('curriculum_year', trimmedCurriculumYear);

      const res = await api.post('/api/curriculum/documents', formData, { timeout: 120_000 });
      return res.data;
    },
    onSuccess: () => {
      success('Dokument wgrany i rozpoczęto przetwarzanie');
      setFile(null);
      setEducationLevel('');
      setSubjectName('');
      setSourceUrl('');
      setCurriculumYear('');
      queryClient.invalidateQueries({ queryKey: ['admin-curriculum-documents'] });
    },
    onError: (err: unknown) => {
      showError(getApiErrorMessage(err, 'Błąd podczas wgrywania dokumentu'));
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

  const openDeleteDialog = React.useCallback((docId: string) => {
    setPendingDeleteId(docId);
    setDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = React.useCallback(() => {
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  }, []);

  const confirmDelete = React.useCallback(() => {
    if (pendingDeleteId) {
      deleteMutation.mutate(pendingDeleteId);
    }
    closeDeleteDialog();
  }, [pendingDeleteId, deleteMutation, closeDeleteDialog]);

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
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' }, color: 'text.primary' }}>
        Zarządzanie Podstawą Programową
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Wgraj dokumenty PDF Podstawy Programowej. System automatycznie przetworzy je do bazy wektorowej.
      </Typography>

      <Card
        variant="outlined"
        sx={{
          mb: 4,
          p: 3,
          borderColor: isDark ? alpha(theme.palette.common.white, 0.14) : alpha(theme.palette.divider, 0.8),
          backgroundColor: isDark
            ? alpha(theme.palette.background.paper, 0.72)
            : alpha(theme.palette.background.paper, 0.96),
          backdropFilter: 'blur(6px)',
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Wgraj nowy dokument
          </Typography>
          {!hasSecretKeys && !isUserLoading && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Brak aktywnego klucza API OpenRouter. Dodaj klucz w Ustawieniach, aby uruchomić przetwarzanie dokumentu.
            </Alert>
          )}
          <Stack spacing={2}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              sx={{
                borderColor: isDark ? alpha(theme.palette.primary.light, 0.45) : alpha(theme.palette.primary.main, 0.35),
              }}
            >
              {file ? file.name : 'Wybierz plik PDF'}
              <input
                type="file"
                accept=".pdf"
                hidden
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] ?? null;
                  if (!selectedFile) {
                    setFile(null);
                    return;
                  }

                  const isPdf =
                    selectedFile.type === 'application/pdf' ||
                    selectedFile.name.toLowerCase().endsWith('.pdf');
                  if (!isPdf) {
                    showError('Dozwolone są tylko pliki PDF.');
                    e.target.value = '';
                    setFile(null);
                    return;
                  }

                  if (selectedFile.size > MAX_CURRICULUM_PDF_SIZE_BYTES) {
                    showError('Plik jest zbyt duży. Maksymalny rozmiar: 50 MB.');
                    e.target.value = '';
                    setFile(null);
                    return;
                  }

                  setFile(selectedFile);
                }}
              />
            </Button>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Poziom edukacji"
                size="small"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                placeholder="np. Szkoła Średnia / Szkoła Podstawowa 1-3"
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: isDark
                      ? alpha(theme.palette.background.default, 0.22)
                      : alpha(theme.palette.background.default, 0.7),
                  },
                }}
              />
              <TextField
                label="Przedmiot"
                size="small"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="np. Język Nowożytny"
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: isDark
                      ? alpha(theme.palette.background.default, 0.22)
                      : alpha(theme.palette.background.default, 0.7),
                  },
                }}
              />
            </Stack>
            <TextField
              label="Link do źródła"
              size="small"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="np. https://zpe.gov.pl/podstawa-programowa"
              required
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: isDark
                    ? alpha(theme.palette.background.default, 0.22)
                    : alpha(theme.palette.background.default, 0.7),
                },
              }}
            />
            <TextField
              label="Rok podstawy programowej"
              size="small"
              value={curriculumYear}
              onChange={(e) => setCurriculumYear(e.target.value)}
              placeholder="np. 2025/2026"
              required
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: isDark
                    ? alpha(theme.palette.background.default, 0.22)
                    : alpha(theme.palette.background.default, 0.7),
                },
              }}
            />
            <Button
              variant="contained"
              onClick={() => uploadMutation.mutate()}
              disabled={
                !file ||
                !educationLevel.trim() ||
                !subjectName.trim() ||
                !sourceUrl.trim() ||
                !curriculumYear.trim() ||
                uploadMutation.isPending ||
                !hasSecretKeys ||
                isUserLoading
              }
              startIcon={uploadMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
              sx={{ alignSelf: 'flex-start' }}
            >
              {uploadMutation.isPending ? 'Wgrywanie...' : 'Wgraj dokument'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

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
        <Stack spacing={1.5}>
          {documents.map((doc) => (
            <CurriculumDocumentRow
              key={doc.id}
              document={doc}
              onDownload={handleDownload}
              showDate
              showAdminMetadata
              actions={(
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Przetwórz ponownie">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => reprocessMutation.mutate(doc.id)}
                        disabled={doc.status === 'processing'}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Usuń">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => openDeleteDialog(doc.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            />
          ))}
        </Stack>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        aria-labelledby="delete-curriculum-dialog-title"
        aria-describedby="delete-curriculum-dialog-description"
      >
        <DialogTitle id="delete-curriculum-dialog-title">Usuń dokument</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-curriculum-dialog-description">
            Czy na pewno chcesz usunąć ten dokument? Plik zostanie usunięty z dysku.
            Osadzone embeddingi zostaną zachowane w bazie danych i będą mogły być
            ponownie wykorzystane, jeśli ten sam dokument zostanie wgrany ponownie.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Anuluj</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            autoFocus
          >
            Usuń
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
