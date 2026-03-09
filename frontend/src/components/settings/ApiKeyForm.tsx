'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useSettings } from '@/hooks/useSettings';

export default function ApiKeyForm() {
  const { settings, updateSettings, isUpdating, validateKey, isValidating } = useSettings();
  const [apiKey, setApiKey] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSave = () => {
    if (apiKey) {
      updateSettings({ openai_api_key: apiKey });
      setApiKey(''); // Clear field after saving for safety
    }
  };

  const handleValidate = () => {
    validateKey();
  };

  const hasKey = settings?.has_api_key;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium">
          Status klucza API:
        </Typography>
        {hasKey ? (
          <Chip icon={<CheckCircleIcon />} label="Skonfigurowany" color="success" size="small" />
        ) : (
          <Chip icon={<ErrorIcon />} label="Brak klucza" color="error" size="small" />
        )}
      </Box>

      <TextField
        fullWidth
        label="Nowy klucz OpenAI API"
        type={showPassword ? 'text' : 'password'}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        margin="normal"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!apiKey || isUpdating}
          startIcon={isUpdating && <CircularProgress size={20} />}
        >
          Zapisz klucz
        </Button>
        <Button
          variant="outlined"
          onClick={handleValidate}
          disabled={!hasKey || isValidating}
          startIcon={isValidating && <CircularProgress size={20} />}
        >
          Waliduj klucz
        </Button>
      </Box>
    </Box>
  );
}
