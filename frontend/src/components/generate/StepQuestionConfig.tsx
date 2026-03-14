'use client';

import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import Grid2 from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { GenerationParamsForm } from '@/schemas/generation';
import { useTaskTypes } from '@/hooks/useTaskTypes';

const filter = createFilterOptions<string>();
const DIFFICULTY_MARKS = [
  { value: 1, label: 'Bardzo łatwy' },
  { value: 2, label: 'Łatwy' },
  { value: 3, label: 'Średni' },
  { value: 4, label: 'Trudny' },
  { value: 5, label: 'Bardzo trudny' },
];

export default function StepQuestionConfig() {
  const { register, watch, control, formState: { errors } } = useFormContext<GenerationParamsForm>();

  const { taskTypes, createTaskType } = useTaskTypes();



  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Parametry pytań i zadań</Typography>
      <Grid2 container spacing={4}>

        <Grid2 size={{xs:12, md:4}} >
          <TextField
            fullWidth
            type="number"
            label="Liczba zadań ogółem"
            error={!!errors.total_questions}
            helperText={errors.total_questions?.message}
            {...register('total_questions', { valueAsNumber: true })}
            slotProps={{
              htmlInput:{
                min:1,
                max:50
              }
            }}
          />
        </Grid2>
        <Grid2 size={{xs:12, md:4}} >
          <TextField
            fullWidth
            type="number"
            label="Zadania otwarte"
            error={!!errors.open_questions}
            {...register('open_questions', { valueAsNumber: true })}
            slotProps={{
              htmlInput:{
                min:0
              }
            }}
          />
        </Grid2>
        <Grid2 size={{xs:12, md:4}} >
          <TextField
            fullWidth
            type="number"
            label="Zadania zamknięte"
            error={!!errors.closed_questions}
            helperText={errors.closed_questions?.message}
            {...register('closed_questions', { valueAsNumber: true })}
            slotProps={{
              htmlInput:{
                min:0
              }
            }}
          />
        </Grid2>

        <Grid2 size={{xs:12}}>
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
                    placeholder="Wybierz z listy lub wpisz własny typ..."
                    error={!!errors.task_types}
                    helperText={errors.task_types?.message}
                  />
                )}
              />
            )}
          />
        </Grid2>

        <Grid2 size={{xs:12, md:6}} >
          <Controller
            name="difficulty"
            control={control}
            render={({ field }) => (
              <Box sx={{ px: 1, py: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 500 }}>
                  Poziom trudności AI: {watch('difficulty')}
                </Typography>
                <Slider
                  value={Number(field.value ?? 1)}
                  onChange={(_, value) => field.onChange(value as number)}
                  min={1}
                  max={5}
                  step={1}
                  marks={DIFFICULTY_MARKS}
                  valueLabelDisplay="auto"
                  aria-label="Poziom trudności AI"
                />
                {errors.difficulty?.message && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {errors.difficulty.message}
                  </Typography>
                )}
              </Box>
            )}
          />
        </Grid2>

        <Grid2 size={{xs:12, md:6}} >
          <TextField
             fullWidth
             type="number"
             label="Liczba wariantów (Grup, np. A/B)"
             error={!!errors.variants_count}
             helperText={errors.variants_count?.message}
             {...register('variants_count', { valueAsNumber: true })}
             slotProps={{htmlInput:{min:1, max:6}}}
          />
        </Grid2>

        <Grid2 size={{xs:12}}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Materiały, instrukcje i uwagi dla AI (opcjonalne)"
            placeholder="Wpisz wytyczne np. 'Uwzględnij pytania o bitwę pod Grunwaldem...'"
            error={!!errors.instructions}
            helperText={errors.instructions?.message}
            {...register('instructions')}
          />
        </Grid2>
      </Grid2>
    </Box>
  );
}
