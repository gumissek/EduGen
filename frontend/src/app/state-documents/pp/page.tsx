'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid2 from '@mui/material/Grid2';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { CurriculumDocument } from '@/types';

interface CurriculumDocumentsResponse {
  documents: CurriculumDocument[];
  total: number;
}

export default function CurriculumPublicPage() {
  const { data, isLoading, isError } = useQuery<CurriculumDocumentsResponse>({
    queryKey: ['curriculum-documents-public'],
    queryFn: async () => {
      const res = await api.get('/api/curriculum/documents');
      return res.data;
    },
  });

  const documents = data?.documents ?? [];

  const handleDownload = (docId: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/curriculum/documents/${docId}/download`;
    link.download = filename;
    link.click();
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        Podstawa Programowa — Źródła danych
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        System EduGen wykorzystuje oficjalne dokumenty Podstawy Programowej MEN do weryfikacji zgodności
        generowanych materiałów edukacyjnych z wymaganiami ministerialnymi.
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Nie udało się załadować listy dokumentów.
        </Alert>
      )}

      {!isLoading && !isError && documents.length === 0 && (
        <Alert severity="info">
          Brak dokumentów Podstawy Programowej. Administrator musi je wgrać do systemu.
        </Alert>
      )}

      <Grid2 container spacing={3}>
        {documents.map((doc) => (
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={doc.id}>
            <Card variant="outlined" sx={{ height: '100%', transition: 'all 0.2s', '&:hover': { boxShadow: 4 } }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <DescriptionIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600} noWrap title={doc.original_filename}>
                    {doc.original_filename}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {doc.education_level && (
                    <Chip label={doc.education_level} size="small" color="primary" variant="outlined" />
                  )}
                  {doc.subject_name && (
                    <Chip label={doc.subject_name} size="small" color="secondary" variant="outlined" />
                  )}
                  <Chip
                    label={doc.status === 'ready' ? 'Gotowy' : doc.status}
                    size="small"
                    color={doc.status === 'ready' ? 'success' : 'default'}
                  />
                </Box>

                {doc.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {doc.description}
                  </Typography>
                )}

                <Typography variant="caption" color="text.secondary" display="block">
                  Strony: {doc.page_count ?? '-'} · Fragmenty: {doc.chunk_count}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Dodano: {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                </Typography>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(doc.id, doc.original_filename)}
                  fullWidth
                >
                  Pobierz PDF
                </Button>
              </CardContent>
            </Card>
          </Grid2>
        ))}
      </Grid2>
    </Box>
  );
}
