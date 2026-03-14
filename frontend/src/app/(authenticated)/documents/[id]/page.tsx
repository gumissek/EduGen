'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useRouter } from 'next/navigation';
import { useDocumentDetails } from '@/hooks/useDocuments';
import dynamic from 'next/dynamic';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { extractCommentsFromHtml } from '@/components/editor/TipTapEditor';

const TipTapEditor = dynamic(() => import('@/components/editor/TipTapEditor'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  ),
});

export default function DocumentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { 
    document, 
    isLoading, 
    updateDocument, 
    isUpdating, 
    exportPDF, 
    isExportingPDF, 
    exportWord, 
    isExportingWord,
    moveToDraft,
    isMovingToDraft,
  } = useDocumentDetails(id);

  const [content, setContent] = React.useState('');
  const [isEdited, setIsEdited] = React.useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);

  React.useEffect(() => {
    if (document?.content && !isEdited) {
      setContent(document.content ?? '');
    }
  }, [document, isEdited]);

  const handleSave = async () => {
    const commentsJson = extractCommentsFromHtml(content);
    await updateDocument(content, commentsJson);
    setIsEdited(false);
  };

  const handleMoveToDraft = async () => {
    const result = await moveToDraft();
    setIsMoveDialogOpen(false);
    router.push(`/generate/${result.generation_id}/editor`);
  };

  const handleEditWithAI = () => {
    setIsEditMode(true);
    setIsMoveDialogOpen(true);
  };

  if (isLoading) return <CircularProgress />;
  if (!document) return <Typography>Nie znaleziono materiału.</Typography>;

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar – stacks on mobile */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <Button 
            startIcon={<KeyboardArrowLeftIcon />} 
            onClick={() => router.push('/dashboard')}
            sx={{ mr: 1, color: 'text.secondary', flexShrink: 0 }}
          >
            Wróć
          </Button>
          <Typography variant="h5" fontWeight="bold" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
            {document.title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          {/* <Button 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!isEdited || isUpdating}
            sx={{ borderRadius: 2, px: 3, fontWeight: 600, flex: { xs: 1, sm: 'none' } }}
          >
            Zapisz
          </Button> */}
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditNoteIcon />}
            onClick={handleEditWithAI}
            disabled={isMovingToDraft}
            sx={{ borderRadius: 2 }}
          >
            Edytuj z AI i przenieś na wersję roboczą
          </Button>
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={isExportingWord ? <CircularProgress size={20} color="inherit" /> : <DescriptionIcon />}
            onClick={() => exportWord()}
            disabled={isExportingWord}
            sx={{ borderRadius: 2 }}
          >
            Word
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            startIcon={isExportingPDF ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
            onClick={() => exportPDF()}
            disabled={isExportingPDF}
            sx={{ borderRadius: 2 }}
          >
            PDF
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <TipTapEditor 
          initialContent={content} 
          onChange={(html) => {
            setContent(html);
            if (html !== (document.content ?? '')) setIsEdited(true);
          }}
          readOnly={!isEditMode}
        />
      </Box>

      <ConfirmDialog
        open={isMoveDialogOpen}
        title="Przenieś do wersji roboczej"
        message="Czy na pewno chcesz zamienić ten dokument w wersję roboczą w celu edycji?"
        confirmLabel="Tak, przenieś"
        severity="warning"
        isLoading={isMovingToDraft}
        onConfirm={handleMoveToDraft}
        onCancel={() => setIsMoveDialogOpen(false)}
      />
    </Box>
  );
}
