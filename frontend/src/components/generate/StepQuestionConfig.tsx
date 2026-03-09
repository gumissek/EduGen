'use client';

import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { GenerationParamsForm } from '@/schemas/generation';
import { DIFFICULTY_LEVELS } from '@/lib/constants';
import { useTaskTypes } from '@/hooks/useTaskTypes';

const filter = createFilterOptions<string>();

export default function StepQuestionConfig() {
  const { register, watch, control, formState: { errors } } = useFormContext<GenerationParamsForm>();

  const watchTotal = watch('total_questions');
  const watchOpen = watch('open_questions');
  const watchClosed = watch('closed_questions');

  const { taskTypes, createTaskType } = useTaskTypes();



  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Parametry pytań</Typography>
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Liczba zadań"
          error={!!errors.total_questions}
          helperText={errors.total_questions?.message}
          {...register('total_questions', { valueAsNumber: true })}
          InputProps={{ inputProps: { min: 1, max: 50 } }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Pytania otwarte"
          error={!!errors.open_questions}
          {...register('open_questions', { valueAsNumber: true })}
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Pytania zamknięte"
          error={!!errors.closed_questions}
          helperText={errors.closed_questions?.message}
          {...register('closed_questions', { valueAsNumber: true })}
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name="task_types"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <Autocomplete
              {...field}
              multiple
              freeSolo
              options={taskTypes}
              value={field.value || []}
              filterOptions={(options, params) => {
                const filtered = filter(options, params);
                const { inputValue } = params;
                const isExisting = options.some((option) => inputValue === option);
                if (inputValue !== '' && !isExisting) {
                  filtered.push(`Dodaj: "${inputValue}"`);
                }
                return filtered;
              }}
              getOptionLabel={(option) => {
                if (typeof option === 'string' && option.startsWith('Dodaj: "')) {
                    return option.substring(8, option.length - 1);
                }
                return option;
              }}
              onChange={async (event, newValue) => {
                const processedValues: string[] = [];
                for (let val of newValue) {
                   if (typeof val === 'string' && val.startsWith('Dodaj: "')) {
                      val = val.substring(8, val.length - 1);
                   }
                   val = val.trim();
                   if (!taskTypes.includes(val) && val !== '') {
                      try {
                        await createTaskType(val);
                      } catch(e) {
                         console.error('Failed to create task type', e);
                      }
                   }
                   if (!processedValues.includes(val) && val !== '') {
                      processedValues.push(val);
                   }
                }
                field.onChange(processedValues);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Typy zadań (Zabawa, Prawda/Fałsz, wielokrotny wybór...)"
                  placeholder="Wybierz lub wpisz własny typ"
                  error={!!errors.task_types}
                  helperText={errors.task_types?.message}
                />
              )}
            />
          )}
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
