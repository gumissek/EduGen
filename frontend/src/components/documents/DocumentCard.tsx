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
import { useRouter } from 'next/navigation';
import { Document } from '@/schemas/document';
import { CONTENT_TYPES } from '@/lib/constants';
import { format } from 'date-fns';

interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
}

export default function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const router = useRouter();

  const typeLabel = CONTENT_TYPES.find(c => c.value === document.content_type)?.label || 'Inne';

  const handleClick = () => {
    router.push(`/documents/${document.id}`);
  };

  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: '100%', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', boxShadow: 1 } }}>
      <CardActionArea onClick={handleClick} sx={{ flexGrow: 1, p: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', mb: 2 }}>
            <Box sx={{ color: 'primary.main', mr: 2, mt: 0.5 }}>
              <DescriptionIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h6" component="div" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {document.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Zapisano {format(new Date(document.created_at), 'dd.MM.yyyy HH:mm')}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={typeLabel} size="small" variant="outlined" />
            {document.subject && (
              <Chip label={document.subject.name} size="small" color="primary" variant="outlined" />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2, pt: 0 }}>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(document.id); }} color="error" title="Usuń dokument">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}
