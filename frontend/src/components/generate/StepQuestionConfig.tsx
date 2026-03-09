'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { GenerationParamsForm } from '@/schemas/generation';
import { DIFFICULTY_LEVELS } from '@/lib/constants';

export default function StepQuestionConfig() {
  const { register, watch, formState: { errors } } = useFormContext<GenerationParamsForm>();

  const watchTotal = watch('total_questions');
  const watchOpen = watch('open_questions');
  const watchClosed = watch('closed_questions');

  const showQuestionError = watchOpen + watchClosed !== watchTotal;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Parametry pytań</Typography>
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Suma pytań"
          error={!!errors.total_questions || showQuestionError}
          {...register('total_questions', { valueAsNumber: true })}
          InputProps={{ inputProps: { min: 1, max: 50 } }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Pytania otwarte"
          error={!!errors.open_questions || showQuestionError}
          {...register('open_questions', { valueAsNumber: true })}
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Pytania zamknięte"
          error={!!errors.closed_questions || showQuestionError}
          helperText={showQuestionError ? 'Suma pytań się nie zgadza' : ''}
          {...register('closed_questions', { valueAsNumber: true })}
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          select
          fullWidth
          label="Poziom trudności AI"
          error={!!errors.difficulty}
          helperText={errors.difficulty?.message}
          {...register('difficulty', { valueAsNumber: true })}
          value={watch('difficulty')}
        >
          {DIFFICULTY_LEVELS.map((diff) => (
            <MenuItem key={diff.value} value={diff.value}>
              {diff.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
           fullWidth
           type="number"
           label="Liczba wariantów (Grup, np. A/B)"
           error={!!errors.variants_count}
           helperText={errors.variants_count?.message}
           {...register('variants_count', { valueAsNumber: true })}
           InputProps={{ inputProps: { min: 1, max: 6 } }}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Materiały, instrukcje i uwagi dla AI (opcjonalne)"
          placeholder="Wpisz konkretne wytyczne, np. Uwzględnij pytania o bitwę pod Grunwaldem..."
          error={!!errors.instructions}
          helperText={errors.instructions?.message}
          {...register('instructions')}
        />
      </Grid>
    </Grid>
  );
}
