'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Radio from '@mui/material/Radio';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSettings } from '@/hooks/useSettings';
import { useUserAIModels, UserAIModelCreate } from '@/hooks/useUserAIModels';

// Step 1 form state for Add Model dialog
interface AddModelForm {
  provider: string;
  model_name: string;
  description: string;
  price_description: string;
}

const EMPTY_FORM: AddModelForm = {
  provider: '',
  model_name: '',
  description: '',
  price_description: '',
};

export default function ModelSelector() {
  const { settings, updateSettings, isUpdating } = useSettings();
  const { models, isLoading, createModel, isCreating, deleteModel, isDeleting } = useUserAIModels();

  // Dialog state
  const [addStep, setAddStep] = React.useState<'form' | 'confirm' | null>(null);
  const [form, setForm] = React.useState<AddModelForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = React.useState<Partial<AddModelForm>>({});
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const currentModel = settings?.default_model ?? '';

  // Derive currently selected model full key: provider/model_name
  const selectedKey = currentModel;

  const handleSelectModel = (key: string) => {
    if (key !== selectedKey) {
      updateSettings({ default_model: key });
    }
  };

  // ---- Add model ----
  const handleFormChange = (field: keyof AddModelForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<AddModelForm> = {};
    if (!form.provider.trim()) errors.provider = 'Provider jest wymagany';
    if (!form.model_name.trim()) errors.model_name = 'Nazwa modelu jest wymagana';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setAddStep('form');
  };

  const handleFormNext = () => {
    if (validateForm()) setAddStep('confirm');
  };

  const handleConfirmAdd = async () => {
    const payload: UserAIModelCreate = {
      provider: form.provider.trim().toLowerCase(),
      model_name: form.model_name.trim().toLowerCase(),
      description: form.description.trim() || undefined,
      price_description: form.price_description.trim() || undefined,
    };
    await createModel(payload);
    setAddStep(null);
    // Auto-select the newly created model
    updateSettings({ default_model: `${payload.provider}/${payload.model_name}` });
  };

  const handleCloseAdd = () => setAddStep(null);

  // ---- Delete model ----
  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteModel(deleteId);
      setDeleteId(null);
    }
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
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Twoje modele AI
          </Typography>
          <Chip
            label={models.length > 0 ? `${models.length} modeli` : 'Brak modeli'}
            size="small"
            color={models.length > 0 ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={handleOpenAdd}
          sx={{ fontWeight: 600 }}
        >
          Dodaj model
        </Button>
      </Box>

      {models.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.01)', borderRadius: 3, borderStyle: 'dashed' }}
        >
          <Typography variant="body2" color="text.secondary">
            Brak modeli AI. Dodaj pierwszy model, aby móc generować materiały.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Provider</TableCell>
                <TableCell>Nazwa modelu</TableCell>
                <TableCell>Opis</TableCell>
                <TableCell>Cena</TableCell>
                <TableCell align="right">Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {models.map((model) => {
                const key = `${model.provider}/${model.model_name}`;
                const isSelected = key === selectedKey;
                return (
                  <TableRow
                    key={model.id}
                    hover
                    selected={isSelected}
                    onClick={() => handleSelectModel(key)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Radio
                        checked={isSelected}
                        onChange={() => handleSelectModel(key)}
                        disabled={isUpdating}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isSelected && <CheckCircleIcon fontSize="small" color="success" />}
                        <Chip label={model.provider} size="small" variant="outlined" />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {model.model_name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {model.description ?? '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {model.price_description ?? '—'}
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Usuń model">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteId(model.id)}
                          disabled={isDeleting}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {isUpdating && <CircularProgress size={20} sx={{ mt: 1 }} />}

      {/* ─── Step 1: Add model form ─── */}
      <Dialog open={addStep === 'form'} onClose={handleCloseAdd} maxWidth="sm" fullWidth>
        <DialogTitle>Dodaj własny model AI</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            Upewnij się, że model istnieje na{' '}
            <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>
              openrouter.ai/models
            </a>
            . Nieprawidłowy identyfikator spowoduje błąd podczas generowania.
          </Alert>
          <TextField
            fullWidth
            required
            label="Provider"
            value={form.provider}
            onChange={handleFormChange('provider')}
            placeholder="np. openai"
            margin="normal"
            error={!!formErrors.provider}
            helperText={formErrors.provider ?? 'Nazwa dostawcy (np. openai, anthropic, google). Zostanie zapisana małymi literami.'}
          />
          <TextField
            fullWidth
            required
            label="Nazwa modelu"
            value={form.model_name}
            onChange={handleFormChange('model_name')}
            placeholder="np. gpt-4o"
            margin="normal"
            error={!!formErrors.model_name}
            helperText={formErrors.model_name ?? 'Identyfikator modelu z OpenRouter. Zostanie zapisana małymi literami.'}
          />
          <TextField
            fullWidth
            label="Opis (opcjonalny)"
            value={form.description}
            onChange={handleFormChange('description')}
            placeholder="np. Najlepszy do analizy tekstu"
            margin="normal"
          />
          <TextField
            fullWidth
            label="Opis ceny (opcjonalny)"
            value={form.price_description}
            onChange={handleFormChange('price_description')}
            placeholder="np. Drogi"
            margin="normal"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAdd}>Anuluj</Button>
          <Button
            variant="contained"
            onClick={handleFormNext}
            disabled={!form.provider.trim() || !form.model_name.trim()}
          >
            Dalej
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Step 2: Confirmation ─── */}
      <Dialog open={addStep === 'confirm'} onClose={handleCloseAdd} maxWidth="sm" fullWidth>
        <DialogTitle>Potwierdź dodanie modelu</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Czy jesteś pewien, że model{' '}
            <strong>
              {form.provider.trim().toLowerCase()}/{form.model_name.trim().toLowerCase()}
            </strong>{' '}
            istnieje na{' '}
            <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>
              OpenRouter
            </a>
            ? Jeśli model nie istnieje, generowanie zakończy się błędem.
          </Alert>
          <DialogContentText>
            <strong>Provider:</strong> {form.provider.trim().toLowerCase()}
            <br />
            <strong>Model:</strong> {form.model_name.trim().toLowerCase()}
            {form.description && (
              <>
                <br />
                <strong>Opis:</strong> {form.description.trim()}
              </>
            )}
            {form.price_description && (
              <>
                <br />
                <strong>Cena:</strong> {form.price_description.trim()}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddStep('form')}>Wstecz</Button>
          <Button
            variant="contained"
            onClick={handleConfirmAdd}
            disabled={isCreating}
            startIcon={isCreating ? <CircularProgress size={18} /> : undefined}
          >
            {isCreating ? 'Dodawanie...' : 'Dodaj model'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete confirmation ─── */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs">
        <DialogTitle>Potwierdź usunięcie</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Czy na pewno chcesz usunąć ten model AI? Tej operacji nie można cofnąć.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Anuluj</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={18} /> : undefined}
          >
            Usuń
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
