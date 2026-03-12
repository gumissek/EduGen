'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useRouter } from 'next/navigation';
import { Document } from '@/schemas/document';
import { CONTENT_TYPES } from '@/lib/constants';
import { format } from 'date-fns';

interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
  onCopy?: (id: string) => void;
}

export default function DocumentCard({ document, onDelete, onCopy }: DocumentCardProps) {
  const router = useRouter();

  const typeLabel = CONTENT_TYPES.find(c => c.value === document.content_type)?.label || 'Inne';

  const handleClick = () => {
    router.push(`/documents/${document.id}`);
  };

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
      <CardActionArea onClick={handleClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ color: 'primary.main', mr: 2, bgcolor: 'rgba(1, 72, 131, 0.08)', width: 48, height: 48, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DescriptionIcon />
            </Box>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', fontSize: '1.1rem', lineHeight: 1.3, mb: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {document.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {format(new Date(document.created_at), 'dd.MM.yyyy HH:mm')}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={typeLabel} size="small" variant="outlined" color="primary" />
          </Box>
        </CardContent>
      </CardActionArea>
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2, pt: 0 }}>
        {onCopy && (
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCopy(document.id); }} title="Utwórz kopię dokumentu" color="primary" sx={{ bgcolor: 'rgba(1, 72, 131, 0.08)', '&:hover': { bgcolor: 'rgba(1, 72, 131, 0.16)' }, transition: 'all 0.2s' }}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(document.id); }} title="Usuń dokument" color="error" sx={{ bgcolor: 'rgba(229, 57, 53, 0.08)', '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.16)' }, transition: 'all 0.2s' }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}
