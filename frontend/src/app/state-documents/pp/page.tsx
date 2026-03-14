'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useQuery } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { CurriculumDocument } from '@/types';
import MainLayout from '@/components/layout/MainLayout';
import CurriculumDocumentRow from '@/components/curriculum/CurriculumDocumentRow';

interface CurriculumDocumentsResponse {
  documents: CurriculumDocument[];
  total: number;
}

export default function CurriculumPublicPage() {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAuthenticatedUser = isMounted ? Boolean(Cookies.get('edugen-auth')) : false;

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

  const content = (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' }, color: 'text.primary' }}>
        Podstawa Programowa - Źródła danych
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        System EduGen wykorzystuje oficjalne dokumenty Podstawy Programowej MEN do weryfikacji zgodności
        generowanych materiałów edukacyjnych z wymaganiami Ministerstwa Edukacji Narodowej.
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
          Brak gotowych dokumentów Podstawy Programowej. Dokumenty w trakcie przetwarzania pojawią się tutaj po zakończeniu.
        </Alert>
      )}

      <Stack spacing={1.5}>
        {documents.map((doc) => (
          <CurriculumDocumentRow
            key={doc.id}
            document={doc}
            onDownload={handleDownload}
          />
        ))}
      </Stack>
    </Box>
  );

  if (isAuthenticatedUser) {
    return <MainLayout>{content}</MainLayout>;
  }

  return content;
}
