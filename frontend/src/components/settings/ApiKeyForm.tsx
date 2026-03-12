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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedIcon from '@mui/icons-material/Verified';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format } from 'date-fns';
import { useSecretKeys } from '@/hooks/useSecretKeys';

export default function ApiKeyForm() {
  const { secretKeys, isLoading, createKey, isCreating, deleteKey, isDeleting, validateKey, isValidating } = useSecretKeys();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [keyName, setKeyName] = React.useState('');
  const [secretKeyValue, setSecretKeyValue] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const handleAdd = async () => {
    if (!keyName.trim() || !secretKeyValue.trim()) return;
    await createKey({
      platform: 'openrouter',
      key_name: keyName.trim(),
      secret_key: secretKeyValue.trim(),
    });
    setKeyName('');
    setSecretKeyValue('');
    setShowPassword(false);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteKey(id);
    setDeleteConfirmId(null);
  };

  const handleValidate = (id: string) => {
    validateKey(id);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Twoje klucze API
          </Typography>
          <Chip
            label={secretKeys.length > 0 ? `${secretKeys.length} kluczy` : 'Brak kluczy'}
            size="small"
            color={secretKeys.length > 0 ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => setDialogOpen(true)}
          sx={{ fontWeight: 600 }}
        >
          Dodaj klucz
        </Button>
      </Box>

      {secretKeys.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.01)', borderRadius: 3, borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary">
            Nie masz jeszcze żadnych kluczy API. Dodaj klucz OpenRouter, aby rozpocząć generowanie.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Desktop table – hidden on xs */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, display: { xs: 'none', sm: 'block' } }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nazwa</TableCell>
                  <TableCell>Platforma</TableCell>
                  <TableCell>Data dodania</TableCell>
                  <TableCell>Ostatnie użycie</TableCell>
                  <TableCell align="right">Akcje</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {secretKeys.map((key) => (
                  <TableRow key={key.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {key.is_active && <CheckCircleIcon fontSize="small" color="success" />}
                        <Typography variant="body2" fontWeight={600}>{key.key_name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={key.platform} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {format(new Date(key.created_at), 'dd.MM.yyyy HH:mm')}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {key.last_used_at ? format(new Date(key.last_used_at), 'dd.MM.yyyy HH:mm') : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Waliduj klucz">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleValidate(key.id)}
                            disabled={isValidating}
                          >
                            <VerifiedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Usuń klucz">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteConfirmId(key.id)}
                            disabled={isDeleting}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TableContainer>

          {/* Mobile card list – visible only on xs */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.5 }}>
            {secretKeys.map((key) => (
              <Paper key={key.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {key.is_active && <CheckCircleIcon fontSize="small" color="success" />}
                    <Typography variant="body2" fontWeight={700}>{key.key_name}</Typography>
                  </Box>
                  <Chip label={key.platform} size="small" variant="outlined" />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Dodano: {format(new Date(key.created_at), 'dd.MM.yyyy HH:mm')}
                </Typography>
                {key.last_used_at && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Ostatnie użycie: {format(new Date(key.last_used_at), 'dd.MM.yyyy HH:mm')}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<VerifiedIcon />}
                    onClick={() => handleValidate(key.id)}
                    disabled={isValidating}
                  >
                    Waliduj
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteConfirmId(key.id)}
                    disabled={isDeleting}
                  >
                    Usuń
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        </>
      )}

      {/* Add Key Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dodaj nowy klucz API</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Klucz zostanie zaszyfrowany i bezpiecznie przechowany. Możesz uzyskać klucz na{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>
              openrouter.ai/keys
            </a>
          </Typography>
          <TextField
            fullWidth
            label="Nazwa klucza (etykieta)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="np. Mój klucz OpenRouter"
            margin="normal"
          />
          <TextField
            fullWidth
            label="Klucz API"
            type={showPassword ? 'text' : 'password'}
            value={secretKeyValue}
            onChange={(e) => setSecretKeyValue(e.target.value)}
            placeholder="sk-or-..."
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((s) => !s)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Anuluj</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!keyName.trim() || !secretKeyValue.trim() || isCreating}
            startIcon={isCreating ? <CircularProgress size={18} /> : undefined}
          >
            Dodaj klucz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth="xs">
        <DialogTitle>Potwierdź usunięcie</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Czy na pewno chcesz usunąć ten klucz API? Tej operacji nie można cofnąć.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Anuluj</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
          >
            Usuń
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
