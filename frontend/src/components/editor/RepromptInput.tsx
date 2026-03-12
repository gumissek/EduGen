'use client';

import * as React from 'react';
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

export default function RepromptInput({ onSend, isLoading }: RepromptInputProps) {
  const [prompt, setPrompt] = React.useState('');

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;
    await onSend(prompt);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        // Zmiana na sticky - komponent naturalnie dopasowuje się do kontenera
        position: 'sticky', 
        bottom: { xs: 16, md: 24 }, 
        margin: '0 auto', 
        width: { xs: 'calc(100% - 32px)', md: '100%' }, 
        maxWidth: 680, 
        borderRadius: '32px',
        p: '6px 6px 6px 20px',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.paper',
        zIndex: 10, 
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
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
        InputProps={{ disableUnderline: true }}
      />
      <IconButton 
        color="primary" 
        onClick={handleSend} 
        disabled={!prompt.trim() || isLoading}
        sx={{ 
          bgcolor: prompt.trim() ? 'primary.main' : 'rgba(0,0,0,0.04)', 
          color: prompt.trim() ? 'primary.contrastText' : 'text.disabled',
          '&:hover': { bgcolor: prompt.trim() ? 'primary.dark' : 'rgba(0,0,0,0.04)' },
          transition: 'all 0.2s',
          p: 1.5
        }}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : <SendIcon fontSize="small" />}
      </IconButton>
    </Paper>
  );
}