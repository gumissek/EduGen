'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Paper from '@mui/material/Paper';

interface RepromptInputProps {
  onSend: (prompt: string) => Promise<void>;
  isLoading: boolean;
}

const FIXED_BOTTOM_OFFSET = 30;

export default function RepromptInput({ onSend, isLoading }: RepromptInputProps) {
  const [prompt, setPrompt] = React.useState('');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;
    await onSend(prompt);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <Paper
      elevation={0}
      sx={(muiTheme) => ({
        width: 'calc(100% - 24px)',
        maxWidth: 680,
        borderRadius: '32px',
        p: '6px 6px 6px 20px',
        display: 'flex',
        alignItems: 'center',
        position: 'fixed',
        left: '50%',
        bottom: FIXED_BOTTOM_OFFSET,
        transform: 'translateX(-50%)',
        zIndex: 1300,
        bgcolor: muiTheme.palette.mode === 'dark' ? '#1c0b2b' : '#fdf5ff',
        border: '2px solid',
        borderColor: muiTheme.palette.mode === 'dark' ? '#702b9d' : '#e0b3ff',
        boxShadow:
          muiTheme.palette.mode === 'dark'
            ? '0 8px 32px rgba(162, 85, 247, 0.2)'
            : '0 8px 32px rgba(192, 132, 252, 0.25)',
        backdropFilter: 'blur(8px)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      })}
    >
      <Box
        sx={{
          color: (muiTheme) =>
            muiTheme.palette.mode === 'dark' ? '#c879ff' : '#9333ea',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <AutoAwesomeIcon />
      </Box>

      <TextField
        fullWidth
        placeholder="Poproś AI o zmianę... (np. ułóż trudniejsze pytania)"
        variant="standard"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        sx={{ mx: 2, '& .MuiInputBase-input': { py: 1.5, fontSize: '0.95rem' } }}
        slotProps={{
          input: {
            disableUnderline: true,
          },
        }}
      />

      <IconButton
        onClick={() => {
          void handleSend();
        }}
        disabled={!prompt.trim() || isLoading}
        sx={(muiTheme) => ({
          background: prompt.trim()
            ? 'linear-gradient(45deg, #d946ef, #9333ea)'
            : muiTheme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.04)',
          color: prompt.trim() ? '#fff' : 'text.disabled',
          '&:hover': {
            background: prompt.trim()
              ? 'linear-gradient(45deg, #c026d3, #7e22ce)'
              : muiTheme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.08)',
          },
          transition: 'all 0.2s',
          p: 1.5,
        })}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : <SendIcon fontSize="small" />}
      </IconButton>
    </Paper>,
    document.body
  );
}
