'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import { GenerationParamsForm } from '@/schemas/generation';
import { useFiles } from '@/hooks/useFiles';
import EmptyState from '@/components/ui/EmptyState';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import { SourceFile } from '@/types';

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) return <PictureAsPdfIcon color="error" />;
  if (mimeType.includes('word') || mimeType.includes('doc')) return <DescriptionIcon color="primary" />;
  if (mimeType.includes('image')) return <ImageIcon color="success" />;
  return <DescriptionIcon color="disabled" />;
};

export default function StepSourceFiles() {
  const { watch, setValue } = useFormContext<GenerationParamsForm>();
  const subjectId = watch('subject_id');
  const selectedFiles = watch('source_file_ids') || [];
  
  const { files, isLoading } = useFiles(subjectId);

  const handleToggle = (value: string) => () => {
    const currentIndex = selectedFiles.indexOf(value);
    const newChecked = [...selectedFiles];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setValue('source_file_ids', newChecked, { shouldValidate: true, shouldDirty: true });
  };

  if (isLoading) return <CircularProgress />;

  if (files.length === 0) {
    return (
      <EmptyState
        icon={<FileCopyIcon />}
        title="Brak plików źródłowych"
        description="Ten przedmiot nie ma przypisanych plików. Edytuj materiał na bazie samego tematu i instrukcji."
      />
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>Pliki źródłowe (opcjonalne)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Zaznacz własne materiały (Zeskanowane notatki, opracowania, PDF), z których AI ma skorzystać przy generowaniu pytań i zadań.
      </Typography>

      <List sx={{ width: '100%', bgcolor: 'transparent', display: 'flex', flexDirection: 'column', gap: 1.5, p: 0 }}>
        {files.map((file: SourceFile) => {
          const isProcessing = !file.has_extracted_text && !file.extraction_error;
          const hasError = !!file.extraction_error;
          const isDisabled = isProcessing || hasError;
          const isSelected = selectedFiles.indexOf(file.id) !== -1;

          const secondaryText = isProcessing
            ? 'Plik w trakcie przetwarzania przez AI...'
            : file.extraction_error === 'NO_API_KEY'
              ? '⚠ Brak klucza API OpenAI – skonfiguruj go w Ustawieniach'
              : file.extraction_error === 'RATE_LIMIT'
                ? '⚠ Przekroczono limit API OpenAI – spróbuj ponownie później'
                : file.summary || (file.file_type === 'pdf' ? 'Brak podsumowania.' : '');

          return (
            <ListItem
              key={file.id}
              disablePadding
              sx={{
                border: '2px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                borderRadius: '16px',
                bgcolor: isSelected ? 'rgba(1, 72, 131, 0.04)' : 'background.paper',
                transition: 'all 0.2s ease-in-out',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: isDisabled ? 'divider' : 'primary.main',
                  bgcolor: isDisabled ? 'background.paper' : isSelected ? 'rgba(1, 72, 131, 0.06)' : 'rgba(1, 72, 131, 0.02)',
                  transform: isDisabled ? 'none' : 'translateY(-2px)'
                }
              }}
            >
              <ListItemButton
                role={undefined}
                onClick={handleToggle(file.id)}
                disabled={isDisabled}
                sx={{ p: 2, alignItems: 'center' }}
              >
                <ListItemIcon sx={{ minWidth: 48, ml: -1 }}>
                  <Checkbox
                    edge="start"
                    checked={isSelected}
                    tabIndex={-1}
                    disableRipple
                    sx={{ '&.Mui-checked': { color: 'primary.main' } }}
                  />
                </ListItemIcon>
                <ListItemIcon sx={{ minWidth: 56, color: 'primary.main' }}>
                  <Box sx={{ p: 1, bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getFileIcon(file.file_type)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={file.filename}
                  secondary={secondaryText}
                  primaryTypographyProps={{ fontWeight: 600, color: isSelected ? 'primary.main' : 'text.primary', mb: 0.5 }}
                  secondaryTypographyProps={{ 
                    color: hasError ? 'error.main' : 'text.secondary', 
                    sx: { display: '-webkit-box', WebkitLineClamp: isSelected ? 3 : 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      
      {/* We need ListItemButton imported from MUI, so let's use it */}
    </Box>
  );
}
