'use client';

import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { GenerationParamsForm } from '@/schemas/generation';
import { useSubjects } from '@/hooks/useSubjects';
import { LANGUAGE_LEVELS } from '@/lib/constants';
import CircularProgress from '@mui/material/CircularProgress';
import { Subject } from '@/types';

interface EduLevelOption {
  value: string;
  label: string;
  inputValue?: string;
  classRange?: [number, number];
}

const EDUCATION_LEVEL_OPTIONS: EduLevelOption[] = [
  { value: 'primary',   label: 'Szkoła podstawowa', classRange: [1, 8] },
  { value: 'secondary', label: 'Szkoła średnia',    classRange: [1, 4] },
];

interface ClassOption {
  value: number | string;
  label: string;
  inputValue?: string;
}

const filterEduOptions   = createFilterOptions<EduLevelOption>();
const filterClassOptions = createFilterOptions<ClassOption>();

function buildClassOptions(classRange: [number, number]): ClassOption[] {
  return Array.from(
    { length: classRange[1] - classRange[0] + 1 },
    (_, i) => ({ value: classRange[0] + i, label: `Klasa ${classRange[0] + i}` }),
  );
}

export default function StepSubjectConfig() {
  const { register, watch, setValue, control, formState: { errors } } = useFormContext<GenerationParamsForm>();
  const { subjects, isLoading } = useSubjects();

  const selectedEducationLevel = watch('education_level');
  const selectedSubjectId      = watch('subject_id');

  const knownLevel = EDUCATION_LEVEL_OPTIONS.find(l => l.value === selectedEducationLevel);
  const classRange: [number, number] = knownLevel?.classRange ?? [1, 8];
  const classOptions = buildClassOptions(classRange);

  const selectedSubject   = subjects.find((s: Subject) => s.id === selectedSubjectId);
  const isLanguageSubject = selectedSubject?.name.toLowerCase().includes('jez') ||
                            selectedSubject?.name.toLowerCase().includes('j.');

  React.useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setValue('subject_id', subjects[0].id);
    }
  }, [subjects, selectedSubjectId, setValue]);

  if (isLoading) return <CircularProgress />;

  return (
    <Grid container spacing={3}>

      {/* Subject */}
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

      {/* Education level (enum + custom) */}
      <Grid item xs={12} md={6}>
        <Controller
          name="education_level"
          control={control}
          render={({ field }) => {
            const currentOption: EduLevelOption | undefined =
              EDUCATION_LEVEL_OPTIONS.find(o => o.value === field.value) ??
              (field.value ? { value: field.value, label: field.value } : undefined);

            return (
              <Autocomplete<EduLevelOption, false, true, true>
                freeSolo
                value={currentOption}
                options={EDUCATION_LEVEL_OPTIONS}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
                filterOptions={(options, params) => {
                  const filtered = filterEduOptions(options, params);
                  const { inputValue } = params;
                  const exists = options.some(o => o.label === inputValue || o.value === inputValue);
                  if (inputValue !== '' && !exists) {
                    filtered.push({ value: inputValue, label: `Dodaj: "${inputValue}"`, inputValue });
                  }
                  return filtered;
                }}
                disableClearable
                onChange={(_e, newValue) => {
                  if (newValue === null || newValue === '') {
                    // disableClearable prevents this, but guard just in case
                    return;
                  } else if (typeof newValue === 'string') {
                    if (newValue.trim() === '') return;
                    field.onChange(newValue.trim());
                    setValue('class_level', 1);
                  } else {
                    field.onChange(newValue.inputValue ?? newValue.value);
                    setValue('class_level', 1);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Poziom edukacji"
                    required
                    error={!!errors.education_level}
                    helperText={errors.education_level?.message ?? 'Wybierz z listy lub wpisz własny poziom'}
                  />
                )}
              />
            );
          }}
        />
      </Grid>

      {/* Class level (enum + custom) */}
      <Grid item xs={12} md={6}>
        <Controller
          name="class_level"
          control={control}
          render={({ field }) => {
            const numVal = Number(field.value);
            const currentOption: ClassOption | undefined =
              classOptions.find(o => o.value === numVal) ??
              (field.value != null ? { value: numVal, label: `Klasa | Semestr ${field.value}` } : undefined);

            return (
              <Autocomplete<ClassOption, false, true, true>
                freeSolo
                value={currentOption}
                options={classOptions}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
                filterOptions={(options, params) => {
                  const filtered = filterClassOptions(options, params);
                  const { inputValue } = params;
                  const num = Number(inputValue);
                  const isValidNum =
                    inputValue !== '' && !isNaN(num) && Number.isInteger(num) && num > 0;
                  const exists = options.some(o => String(o.value) === inputValue);
                  if (isValidNum && !exists) {
                    filtered.push({ value: num, label: `Dodaj: klasa ${num}`, inputValue });
                  }
                  return filtered;
                }}
                disableClearable
                onChange={(_e, newValue) => {
                  if (newValue === null) {
                    // disableClearable prevents this
                    return;
                  } else if (typeof newValue === 'string') {
                    const n = parseInt(newValue, 10);
                    if (!isNaN(n) && n > 0) field.onChange(n);
                  } else {
                    const n = Number(newValue.value);
                    if (n > 0) field.onChange(n);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Klasa"
                    required
                    error={!!errors.class_level}
                    helperText={errors.class_level?.message ?? 'Wybierz z listy lub wpisz własną klasę'}
                  />
                )}
              />
            );
          }}
        />
      </Grid>

      {/* Language level (conditional) */}
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

      {/* Topic */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Temat przewodni"
          error={!!errors.topic}
          helperText={errors.topic?.message}
          {...register('topic')}
          required
        />
      </Grid>

      {/* Optional instructions */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Dodatkowe wskazówki (opcjonalne)"
          error={!!errors.instructions}
          helperText={errors.instructions?.message}
          {...register('instructions')}
        />
      </Grid>
    </Grid>
  );
}
