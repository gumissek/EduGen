'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import { useRouter } from 'next/navigation';
import { useDocuments } from '@/hooks/useDocuments';
import DocumentCard from '@/components/documents/DocumentCard';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function DashboardPage() {
  const router = useRouter();
  const { documents, isLoading, deleteDocument } = useDocuments();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteDocument(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          Moje materiały
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => router.push('/generate')}
        >
          Wygeneruj nowy
        </Button>
      </Box>

      {documents.length === 0 ? (
        <EmptyState
          icon={<DescriptionIcon />}
          title="Brak dokumentów"
          description="Nie wygenerowałeś/aś jeszcze żadnych materiałów edukacyjnych. Przejdź do kreatora, aby zacząć!"
          actionLabel="Kreator materiałów"
          onAction={() => router.push('/generate')}
        />
      ) : (
        <Grid container spacing={3}>
          {documents.map((doc: any) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
              <DocumentCard document={doc} onDelete={setDeleteId} />
            </Grid>
          ))}
        </Grid>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Usuń materiał"
        message="Czy na pewno chcesz usunąć ten wygenerowany dokument? Tej operacji nie można prościej cofnąć."
        confirmLabel="Usuń"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
