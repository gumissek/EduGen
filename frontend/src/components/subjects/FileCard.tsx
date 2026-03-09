'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import { SourceFile } from '@/types';
import { format } from 'date-fns';

interface FileCardProps {
  file: SourceFile;
  onDelete: (id: string) => void;
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

export default function FileCard({ file, onDelete }: FileCardProps) {
  const isProcessing = file.extracted_text === null;

  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

        {isProcessing ? (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Przetwarzanie OCR...
            </Typography>
          </Box>
        ) : (
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
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                display: '-webkit-box', 
                WebkitLineClamp: 3, 
                WebkitBoxOrient: 'vertical', 
                overflow: 'hidden' 
              }}
            >
              {file.summary || 'Brak podsumowania.'}
            </Typography>
          </Box>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        <IconButton size="small" onClick={() => onDelete(file.id)} color="error" title="Usuń plik">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}
