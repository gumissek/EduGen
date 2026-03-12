'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import CircularProgress from '@mui/material/CircularProgress';
import NextLink from 'next/link';
import { SourceFile } from '@/types';
import { format } from 'date-fns';

interface FileCardProps {
  file: SourceFile;
  onDelete: (id: string) => void;
  onDownload: (file: SourceFile) => void;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) return <PictureAsPdfIcon color="error" />;
  if (mimeType.includes('word') || mimeType.includes('doc')) return <DescriptionIcon color="primary" />;
  if (mimeType.includes('image')) return <ImageIcon color="success" />;
  return <DescriptionIcon color="disabled" />;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function FileStatusSection({ file }: { file: SourceFile }) {
  if (file.extraction_error === 'NO_API_KEY') {
    return (
      <Alert severity="warning" sx={{ mt: 2, fontSize: '0.75rem', py: 0.5 }}>
        Brak klucza API OpenRouter. Skonfiguruj go w{' '}
        <Link component={NextLink} href="/settings" underline="hover">
          Ustawieniach
        </Link>
        , aby przetworzyć ten plik.
      </Alert>
    );
  }

  if (file.extraction_error === 'RATE_LIMIT') {
    return (
      <Alert severity="error" sx={{ mt: 2, fontSize: '0.75rem', py: 0.5 }}>
        Przekroczono limit zapytań API OpenRouter (Rate Limit). Usuń plik i spróbuj ponownie za chwilę.
      </Alert>
    );
  }

  if (!file.has_extracted_text) {
    const processingLabel =
      file.file_type === 'image'
        ? 'Odczytywanie obrazu...'
        : file.file_type === 'pdf'
          ? 'Odczytywanie pliku...'
          : 'Przetwarzanie dokumentu...';

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          {processingLabel}
        </Typography>
      </Box>
    );
  }

  const summaryText =
    file.summary ||
    (file.file_type === 'pdf' ? 'Brak podsumowania.' : null);

  return (
    <Box sx={{ mt: 2 }}>
      <Chip
        label="Gotowy"
        size="small"
        color="success"
        variant="outlined"
        sx={{ mb: 1, mr: 1 }}
      />
      {file.page_count && (
        <Chip label={`${file.page_count} str.`} size="small" variant="outlined" sx={{ mb: 1 }} />
      )}
      {summaryText && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {summaryText}
        </Typography>
      )}
    </Box>
  );
}

export default function FileCard({ file, onDelete, onDownload }: FileCardProps) {
  return (
    <Card variant="outlined" sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      borderWidth: '1px',
      borderColor: 'divider',
      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
      '&:hover': { 
        borderColor: 'primary.main', 
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.08)' 
      } 
    }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ mr: 1.5, mt: 0.5 }}>{getFileIcon(file.file_type)}</Box>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap title={file.filename}>
              {file.filename}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {formatBytes(file.file_size)} • {format(new Date(file.created_at), 'dd.MM.yyyy HH:mm')}
            </Typography>
          </Box>
        </Box>

        <FileStatusSection file={file} />
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        <IconButton size="small" onClick={() => onDownload(file)} color="primary" title="Pobierz plik">
          <DownloadIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(file.id)} color="error" title="Usuń plik">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}
