'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import Divider from '@mui/material/Divider';
import SubjectList from '@/components/subjects/SubjectList';
import SubjectDialog from '@/components/subjects/SubjectDialog';
import FileUploader from '@/components/subjects/FileUploader';
import FileList from '@/components/subjects/FileList';
import { useSubjects } from '@/hooks/useSubjects';
import { useFiles } from '@/hooks/useFiles';

export default function SubjectsPage() {
  const { subjects, createSubject, deleteSubject, isCreating } = useSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Set first subject as default if none selected
  React.useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const { files, uploadFile, deleteFile } = useFiles(selectedSubjectId);

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
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Przedmioty i materiały źródłowe
      </Typography>
      
      <Grid container spacing={3} sx={{ flexGrow: 1 }}>
        {/* Left column: Subjects */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        </Grid>

        {/* Right column: Files */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
            {selectedSubjectId ? (
              <>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>Dodaj pliki źródłowe</Typography>
                  <FileUploader subjectId={selectedSubjectId} onUpload={handleUpload} />
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="h6" gutterBottom>Wgrane pliki</Typography>
                <FileList files={files} onDelete={deleteFile} />
              </>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography color="text.secondary">Wybierz przedmiot, aby zarządzać jego plikami.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <SubjectDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSubmit={handleCreateSubject} 
        isLoading={isCreating} 
      />
    </Box>
  );
}
