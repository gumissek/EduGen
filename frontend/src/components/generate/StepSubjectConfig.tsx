'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import { GenerationParamsForm } from '@/schemas/generation';
import { useSubjects } from '@/hooks/useSubjects';
import { EDUCATION_LEVELS, LANGUAGE_LEVELS } from '@/lib/constants';
import CircularProgress from '@mui/material/CircularProgress';
import { Subject } from '@/types';

export default function StepSubjectConfig() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<GenerationParamsForm>();
  const { subjects, isLoading } = useSubjects();
  
  const selectedEducationLevel = watch('education_level');
  const selectedSubjectId = watch('subject_id');
  
  const classRange = EDUCATION_LEVELS.find(l => l.value === selectedEducationLevel)?.classRange || [1, 8];
  const classes = Array.from({ length: classRange[1] - classRange[0] + 1 }, (_, i) => classRange[0] + i);

  // Simple heuristic for language subject (if subject name contains 'język' or 'j.')
  const selectedSubject = subjects.find((s: Subject) => s.id === selectedSubjectId);
  const isLanguageSubject = selectedSubject?.name.toLowerCase().includes('jęz') || selectedSubject?.name.toLowerCase().includes('j.');

  // Initialize selected item on load if not set
  React.useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setValue('subject_id', subjects[0].id);
    }
  }, [subjects, selectedSubjectId, setValue]);

  if (isLoading) return <CircularProgress />;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          select
          fullWidth
          label="Przedmiot"
          error={!!errors.subject_id}
          helperText={errors.subject_id?.message}
          {...register('subject_id')}
          value={selectedSubjectId || ''}
        >
          {subjects.map((subject: Subject) => (
            <MenuItem key={subject.id} value={subject.id}>
              {subject.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Poziom edukacji</FormLabel>
          <RadioGroup
            row
            name="education_level"
            value={selectedEducationLevel}
            onChange={(e) => {
              setValue('education_level', e.target.value as any);
              // Reset class level to 1 when changing education level
              setValue('class_level', 1);
            }}
          >
            {EDUCATION_LEVELS.map((level) => (
              <FormControlLabel key={level.value} value={level.value} control={<Radio />} label={level.label} />
            ))}
          </RadioGroup>
        </FormControl>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          select
          fullWidth
          label="Klasa"
          error={!!errors.class_level}
          helperText={errors.class_level?.message}
          {...register('class_level', { valueAsNumber: true })}
          value={watch('class_level')}
        >
          {classes.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls} {selectedEducationLevel === 'primary' ? 'Szkoła Podstawowa' : 'Szkoła Średnia'}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      {isLanguageSubject && (
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="Poziom językowy"
            error={!!errors.language_level}
            helperText={errors.language_level?.message}
            {...register('language_level')}
            value={watch('language_level') || ''}
          >
            <MenuItem value="">Brak skali</MenuItem>
            {LANGUAGE_LEVELS.map((lvl) => (
              <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
            ))}
          </TextField>
        </Grid>
      )}

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Temat zajęć / sprawdzianu"
          error={!!errors.topic}
          helperText={errors.topic?.message}
          {...register('topic')}
          required
        />
      </Grid>
    </Grid>
  );
}
