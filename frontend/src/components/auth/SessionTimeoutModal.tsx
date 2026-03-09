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
    <Dialog open={open} disableEscapeKeyDown>
      <DialogTitle>Sesja wygasa</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Ze względów bezpieczeństwa zostaniesz automatycznie wylogowany za {timeLeft} sekund.
          Czy chcesz przedłużyć sesję?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onLogout} color="error">
          Wyloguj teraz
        </Button>
        <Button onClick={onExtend} color="primary" variant="contained" autoFocus>
          Przedłuż sesję
        </Button>
      </DialogActions>
    </Dialog>
  );
}
