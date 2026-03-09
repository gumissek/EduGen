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
      elevation={3} 
      sx={{ 
        position: 'fixed', 
        bottom: 24, 
        left: '50%', 
        transform: 'translateX(-50%)', 
        width: '100%', 
        maxWidth: 600, 
        borderRadius: 8,
        p: 0.5,
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.paper',
        zIndex: 1000,
      }}
    >
      <Box sx={{ pl: 2, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
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
        sx={{ mx: 2 }}
        InputProps={{ disableUnderline: true }}
      />
      <IconButton 
        color="primary" 
        onClick={handleSend} 
        disabled={!prompt.trim() || isLoading}
        sx={{ mr: 0.5 }}
      >
        {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
      </IconButton>
    </Paper>
  );
}
