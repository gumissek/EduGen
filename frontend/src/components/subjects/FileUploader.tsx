'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinearProgress from '@mui/material/LinearProgress';
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

interface FileUploaderProps {
  subjectId: string;
  onUpload: (formData: FormData, onProgress: (p: number) => void) => Promise<void>;
}

export default function FileUploader({ subjectId, onUpload }: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const { error } = useSnackbar();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = async (files: FileList | File[]) => {
    // Process one file at a time for simplicity in MVP, could loop
    const file = files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      error(`Plik ${file.name} przekracza limit 10MB.`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_id', subjectId);

    setProgress(0);
    try {
      await onUpload(formData, setProgress);
    } catch (err) {
      // Error handled by mutation
    } finally {
      setProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      sx={{
        border: '2px dashed',
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderRadius: 2,
        p: 4,
        textAlign: 'center',
        cursor: 'pointer',
        bgcolor: isDragging ? 'action.hover' : 'background.paper',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".pdf,.docx,.jpg,.jpeg,.png"
      />
      
      <CloudUploadIcon sx={{ fontSize: 48, color: isDragging ? 'primary.main' : 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom color={isDragging ? 'primary.main' : 'text.primary'}>
        Przeciągnij i upuść plik tutaj, lub kliknij aby wybrać
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Obsługiwane: PDF, DOCX, JPG, PNG (maks. 10MB)
      </Typography>

      {progress !== null && (
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}
    </Box>
  );
}
