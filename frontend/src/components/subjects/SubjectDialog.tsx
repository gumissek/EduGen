'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateSubjectSchema, CreateSubjectRequest } from '@/schemas/subject';

interface SubjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubjectRequest) => Promise<void>;
  isLoading: boolean;
}

export default function SubjectDialog({ open, onClose, onSubmit, isLoading }: SubjectDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSubjectRequest>({
    resolver: zodResolver(CreateSubjectSchema),
  });

  React.useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const onFormSubmit = async (data: CreateSubjectRequest) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          p: 2,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }
      }}
    >
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Dodaj nowy przedmiot</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="normal"
            label="Nazwa przedmiotu"
            placeholder='Np. Język Angielski, Matematyka, Fizyka...'
            fullWidth
            error={!!errors.name}
            helperText={errors.name?.message}
            {...register('name')}
            disabled={isLoading}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isLoading} color="inherit" sx={{ fontWeight: 600 }}>
            Anuluj
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading} sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Dodaj'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
