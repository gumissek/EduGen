'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

interface SessionTimeoutModalProps {
  open: boolean;
  timeLeft: number;
  onExtend: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutModal({ open, timeLeft, onExtend, onLogout }: SessionTimeoutModalProps) {
  return (
    <Dialog 
      open={open} 
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: '24px',
          p: 2,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Sesja wygasa</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          Ze względów bezpieczeństwa zostaniesz automatycznie wylogowany za <strong>{timeLeft}</strong> sekund.
          Czy chcesz przedłużyć sesję?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onLogout} color="error" sx={{ fontWeight: 600 }}>
          Wyloguj teraz
        </Button>
        <Button onClick={onExtend} color="primary" variant="contained" autoFocus sx={{ borderRadius: 2, fontWeight: 600 }}>
          Przedłuż sesję
        </Button>
      </DialogActions>
    </Dialog>
  );
}
