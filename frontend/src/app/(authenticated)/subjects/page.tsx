'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Grid2 from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import MuiLink from '@mui/material/Link';
import NextLink from 'next/link';
import SubjectList from '@/components/subjects/SubjectList';
import SubjectDialog from '@/components/subjects/SubjectDialog';
import FileUploader from '@/components/subjects/FileUploader';
import FileList from '@/components/subjects/FileList';
import { useSubjects } from '@/hooks/useSubjects';
import { useFiles } from '@/hooks/useFiles';
import { useSettings } from '@/hooks/useSettings';
import { useSearchParams } from 'next/navigation';

export default function SubjectsPage() {
  const { subjects, createSubject, deleteSubject, isCreating } = useSubjects();
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Pre-select subject from URL param (e.g. coming from dashboard)
  const urlSubjectId = searchParams.get('subjectId');

  // Set selected subject: prefer URL param, then first subject
  React.useEffect(() => {
    if (urlSubjectId && subjects.some((s: { id: string }) => s.id === urlSubjectId)) {
      setSelectedSubjectId(urlSubjectId);
    } else if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId, urlSubjectId]);

  const { files, uploadFile, deleteFile, downloadFile } = useFiles(selectedSubjectId);

  const handleUpload = React.useCallback(
    (formData: FormData, onProgress: (p: number) => void) =>
      uploadFile({ formData, onProgress }).then(() => {}),
    [uploadFile],
  );

  const handleCreateSubject = React.useCallback(
    (data: { name: string }) => createSubject(data).then(() => {}),
    [createSubject],
  );

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
        Przedmioty i materiały źródłowe
      </Typography>
      
      <Grid2 container spacing={{ xs: 2, md: 3 }} sx={{ flexGrow: 1 }}>
        {/* Left column: Subjects */}
        <Grid2 size={{xs:12, md:3}} >
          <Paper sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Przedmioty</Typography>
              <Button 
                startIcon={<AddIcon />} 
                size="small" 
                onClick={() => setIsDialogOpen(true)}
              >
                Dodaj
              </Button>
            </Box>
            <Divider />
            <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
              <SubjectList 
                subjects={subjects} 
                selectedSubjectId={selectedSubjectId}
                onSelect={setSelectedSubjectId}
                onDelete={deleteSubject}
              />
            </Box>
          </Paper>
        </Grid2>

        {/* Right column: Files */}
        <Grid2 size={{xs:12, md:9}} >
          <Paper sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
            {selectedSubjectId ? (
              <>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>Dodaj pliki źródłowe</Typography>
                  {settings && !settings.has_api_key && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <AlertTitle>Brak klucza API OpenRouter</AlertTitle>
                      Przetwarzanie plików graficznych (JPG, PNG) oraz skanów PDF wymaga skonfigurowanego klucza OpenRouter API.
                      Pliki DOCX i tekstowe PDF działają bez klucza.{' '}
                      <MuiLink component={NextLink} href="/settings" underline="hover" fontWeight="bold">
                        Przejdź do Ustawień →
                      </MuiLink>
                    </Alert>
                  )}
                  <FileUploader subjectId={selectedSubjectId} onUpload={handleUpload} />
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="h6" gutterBottom>Wgrane pliki</Typography>
                <FileList files={files} onDelete={deleteFile} onDownload={downloadFile} />
              </>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography color="text.secondary">Wybierz przedmiot, aby zarządzać jego plikami.</Typography>
              </Box>
            )}
          </Paper>
        </Grid2>
      </Grid2>

      <SubjectDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSubmit={handleCreateSubject} 
        isLoading={isCreating} 
      />
    </Box>
  );
}
