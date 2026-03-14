'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
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
  const [selectedYear, setSelectedYear] = React.useState('');

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

  const availableYears = React.useMemo(() => {
    const years = new Set<string>();
    for (const doc of documents) {
      if (doc.curriculum_year) {
        years.add(doc.curriculum_year);
      }
    }
    return Array.from(years).sort();
  }, [documents]);

  const filteredDocuments = React.useMemo(() => {
    if (!selectedYear) return documents;
    return documents.filter((doc) => doc.curriculum_year === selectedYear);
  }, [documents, selectedYear]);

  const handleYearChange = (event: SelectChangeEvent) => {
    setSelectedYear(event.target.value);
  };

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
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        System EduGen wykorzystuje oficjalne dokumenty Podstawy Programowej MEN do weryfikacji zgodności
        generowanych materiałów edukacyjnych z wymaganiami Ministerstwa Edukacji Narodowej.
      </Typography>

      {availableYears.length > 0 && (
        <FormControl size="small" sx={{ mb: 3, minWidth: 220 }}>
          <InputLabel id="curriculum-year-filter-label">Rok podstawy programowej</InputLabel>
          <Select
            labelId="curriculum-year-filter-label"
            value={selectedYear}
            label="Rok podstawy programowej"
            onChange={handleYearChange}
          >
            <MenuItem value="">Wszystkie</MenuItem>
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

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

      {!isLoading && !isError && filteredDocuments.length === 0 && (
        <Alert severity="info">
          {selectedYear
            ? `Brak dokumentów dla roku ${selectedYear}.`
            : 'Brak gotowych dokumentów Podstawy Programowej. Dokumenty w trakcie przetwarzania pojawią się tutaj po zakończeniu.'}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {filteredDocuments.map((doc) => (
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
