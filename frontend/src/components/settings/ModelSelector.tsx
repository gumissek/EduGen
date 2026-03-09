'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { useSettings } from '@/hooks/useSettings';
import CircularProgress from '@mui/material/CircularProgress';

export default function ModelSelector() {
  const { settings, updateSettings, isUpdating } = useSettings();

  const currentModel = settings?.default_model || 'gpt-4o-mini';

  const handleChange = (event: SelectChangeEvent) => {
    updateSettings({ default_model: event.target.value as string });
  };

  return (
    <Box sx={{ mt: 2, minWidth: 200, maxWidth: 400 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Wybierz model, którego aplikacja będzie używać domyślnie. Nowsze modele są droższe, ale skuteczniejsze.
      </Typography>
      <FormControl fullWidth margin="normal">
        <InputLabel id="model-select-label">Model AI</InputLabel>
        <Select
          labelId="model-select-label"
          id="model-select"
          value={currentModel}
          label="Model AI"
          onChange={handleChange}
          disabled={isUpdating}
        >
          {/* Typically we might get these from /validate-key, but standard options for MVP */}
          <MenuItem value="gpt-4o-mini">gpt-4o-mini (Zalecany do tekstu)</MenuItem>
          <MenuItem value="gpt-4o">gpt-4o (Lepsza jakość wizji)</MenuItem>
          <MenuItem value="gpt-5-mini">gpt-5-mini</MenuItem>
        </Select>
      </FormControl>
      {isUpdating && <CircularProgress size={24} sx={{ mt: 1 }} />}
    </Box>
  );
}
