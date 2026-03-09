'use client';

import * as React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert, { AlertColor } from '@mui/material/Alert';

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: AlertColor) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const SnackbarContext = React.createContext<SnackbarContextType>({
  showSnackbar: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export const useSnackbar = () => React.useContext(SnackbarContext);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [severity, setSeverity] = React.useState<AlertColor>('info');

  const showSnackbar = React.useCallback((msg: string, sev: AlertColor = 'info') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const success = React.useCallback((msg: string) => showSnackbar(msg, 'success'), [showSnackbar]);
  const error = React.useCallback((msg: string) => showSnackbar(msg, 'error'), [showSnackbar]);
  const info = React.useCallback((msg: string) => showSnackbar(msg, 'info'), [showSnackbar]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const value = React.useMemo(() => ({ showSnackbar, success, error, info }), [showSnackbar, success, error, info]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar open={open} autoHideDuration={5000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }} variant="filled">
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
