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
import { useRouter } from 'next/navigation';
import { useDocumentDetails } from '@/hooks/useDocuments';
import dynamic from 'next/dynamic';

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
    isExportingWord 
  } = useDocumentDetails(id);

  const [content, setContent] = React.useState('');
  const [isEdited, setIsEdited] = React.useState(false);

  React.useEffect(() => {
    if (document?.content && !isEdited) {
      setContent(document.content ?? '');
    }
  }, [document, isEdited]);

  const handleSave = async () => {
    await updateDocument(content);
    setIsEdited(false);
  };

  if (isLoading) return <CircularProgress />;
  if (!document) return <Typography>Nie znaleziono materiału.</Typography>;

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button 
          startIcon={<KeyboardArrowLeftIcon />} 
          onClick={() => router.push('/dashboard')}
          sx={{ mr: 2, color: 'text.secondary' }}
        >
          Wróć
        </Button>
        <Typography variant="h5" fontWeight="bold" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {document.title}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!isEdited || isUpdating}
          >
            Zapisz
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={isExportingWord ? <CircularProgress size={20} color="inherit" /> : <DescriptionIcon />}
            onClick={() => exportWord()}
            disabled={isExportingWord}
          >
            Word
          </Button>
          <Button 
            variant="contained" 
            color="error"
            startIcon={isExportingPDF ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
            onClick={() => exportPDF()}
            disabled={isExportingPDF}
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
        />
      </Box>
    </Box>
  );
}
