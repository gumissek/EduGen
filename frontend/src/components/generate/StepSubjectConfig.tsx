'use client';

import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import Grid2 from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { GenerationParamsForm } from '@/schemas/generation';
import { useSubjects } from '@/hooks/useSubjects';
import { useLevels } from '@/hooks/useLevels';
import { LANGUAGE_LEVELS } from '@/lib/constants';
import CircularProgress from '@mui/material/CircularProgress';
import { Subject } from '@/types';

interface EduLevelOption {
  value: string;
  label: string;
  inputValue?: string;
  classRange?: [number, number];
}

interface ClassOption {
  value: string;
  label: string;
  inputValue?: string;
}

const filterEduOptions   = createFilterOptions<EduLevelOption>();
const filterClassOptions = createFilterOptions<ClassOption>();

export default function StepSubjectConfig() {
  const { register, watch, setValue, control, formState: { errors } } = useFormContext<GenerationParamsForm>();
  const { subjects, isLoading } = useSubjects();
  const {
    educationLevels,
    isLoadingEdu,
    createEducationLevel,
    deleteEducationLevel,
    classLevels,
    isLoadingClass,
    createClassLevel,
    deleteClassLevel,
  } = useLevels();

  const selectedEducationLevel = watch('education_level');
  const selectedSubjectId      = watch('subject_id');

  // Build education level options from CSV data
  const eduOptions: EduLevelOption[] = React.useMemo(
    () => educationLevels.map((l) => ({
      value: l.value,
      label: l.label,
      classRange: [l.class_range_start, l.class_range_end] as [number, number],
    })),
    [educationLevels],
  );

  // Build class options from CSV data filtered by selected education level
  const classOptions: ClassOption[] = React.useMemo(() => {
    const filtered = classLevels.filter(c => c.education_level === selectedEducationLevel);
    return filtered.map(c => ({ value: c.value, label: c.label }));
  }, [classLevels, selectedEducationLevel]);

  const selectedSubject   = subjects.find((s: Subject) => s.id === selectedSubjectId);
  const isLanguageSubject = selectedSubject?.name.toLowerCase().includes('jez') ||
                            selectedSubject?.name.toLowerCase().includes('j.');

  React.useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setValue('subject_id', subjects[0].id);
    }
  }, [subjects, selectedSubjectId, setValue]);

  if (isLoading || isLoadingEdu || isLoadingClass) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Podstawowe parametry</Typography>
      <Grid2 container spacing={4}>

        {/* Subject */}
        <Grid2 size={{xs:12, md:6}} >
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
        </Grid2>

        {/* Education level (enum + custom) */}
        <Grid2 size={{xs:12, md:6}}>
          <Controller
            name="education_level"
            control={control}
            render={({ field }) => {
              const currentOption: EduLevelOption | undefined =
                eduOptions.find(o => o.value === field.value) ??
                (field.value ? { value: field.value, label: field.value } : undefined);

              return (
                <Autocomplete<EduLevelOption, false, true, true>
                  freeSolo
                  value={currentOption}
                  options={eduOptions}
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
                  onChange={async (_e, newValue) => {
                    if (newValue === null || newValue === '') return;

                    let selectedValue: string;
                    if (typeof newValue === 'string') {
                      if (newValue.trim() === '') return;
                      selectedValue = newValue.trim();
                    } else {
                      selectedValue = newValue.inputValue ?? newValue.value;
                    }

                    // If this is a new custom level, persist it to CSV
                    const isNew = !eduOptions.some(o => o.value === selectedValue);
                    if (isNew && selectedValue) {
                      try {
                        await createEducationLevel({
                          value: selectedValue,
                          label: selectedValue,
                          class_range_start: 1,
                          class_range_end: 8,
                        });
                      } catch {
                        // already exists or error — proceed anyway
                      }
                    }

                    field.onChange(selectedValue);
                    setValue('class_level', 'Klasa 1');
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.value} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flex: 1 }}>{option.label}</Typography>
                      {!option.inputValue && (
                        <Tooltip title="Usuń poziom edukacji">
                          <IconButton
                            size="small"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await deleteEducationLevel(option.value);
                              if (field.value === option.value) {
                                const remaining = eduOptions.filter(o => o.value !== option.value);
                                if (remaining.length > 0) {
                                  field.onChange(remaining[0].value);
                                  setValue('class_level', 'Klasa 1');
                                }
                              }
                            }}
                            sx={{ ml: 1, color: 'error.main', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.08)' } }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
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
        </Grid2>

        {/* Class level (enum + custom) */}
        <Grid2 size={{xs:12, md:6}}>
          <Controller
            name="class_level"
            control={control}
            render={({ field }) => {
              const strVal = String(field.value ?? '');
              const currentOption: ClassOption | undefined =
                classOptions.find(o => o.value === strVal) ??
                (strVal ? { value: strVal, label: strVal } : undefined);

              return (
                <Autocomplete<ClassOption, false, true, true>
                  freeSolo
                  value={currentOption}
                  options={classOptions}
                  getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
                  filterOptions={(options, params) => {
                    const filtered = filterClassOptions(options, params);
                    const { inputValue } = params;
                    const trimmed = inputValue.trim();
                    const exists = options.some(o => o.value === trimmed || o.label === trimmed);
                    if (trimmed !== '' && !exists) {
                      filtered.push({ value: trimmed, label: `Dodaj: "${trimmed}"`, inputValue: trimmed });
                    }
                    return filtered;
                  }}
                  disableClearable
                  onChange={async (_e, newValue) => {
                    if (newValue === null) return;

                    let selectedValue: string;
                    if (typeof newValue === 'string') {
                      if (!newValue.trim()) return;
                      selectedValue = newValue.trim();
                    } else {
                      selectedValue = newValue.inputValue ?? newValue.value;
                    }

                    // Persist new custom class level to CSV
                    const isNew = !classOptions.some(o => o.value === selectedValue);
                    if (isNew && selectedValue && selectedEducationLevel) {
                      try {
                        await createClassLevel({
                          value: selectedValue,
                          label: selectedValue,
                          education_level: selectedEducationLevel,
                        });
                      } catch {
                        // already exists or error — proceed anyway
                      }
                    }

                    field.onChange(selectedValue);
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.value} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flex: 1 }}>{option.label}</Typography>
                      {!option.inputValue && (
                        <Tooltip title="Usuń klasę / semestr">
                          <IconButton
                            size="small"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await deleteClassLevel({
                                educationLevel: selectedEducationLevel,
                                value: option.value,
                              });
                              if (field.value === option.value) {
                                const remaining = classOptions.filter(o => o.value !== option.value);
                                if (remaining.length > 0) {
                                  field.onChange(remaining[0].value);
                                }
                              }
                            }}
                            sx={{ ml: 1, color: 'error.main', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.08)' } }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Klasa / Semestr"
                      required
                      error={!!errors.class_level}
                      helperText={errors.class_level?.message ?? 'Wybierz z listy lub wpisz dowolną wartość (np. Semestr 2)'}
                    />
                  )}
                />
              );
            }}
          />
        </Grid2>

        {/* Language level (conditional) */}
        {isLanguageSubject && (
          <Grid2 size={{xs:12, md:6}}>
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
          </Grid2>
        )}

        {/* Topic */}
        <Grid2 size={{xs:12}}>
          <TextField
            fullWidth
            label="Temat przewodni"
            error={!!errors.topic}
            helperText={errors.topic?.message}
            {...register('topic')}
            required
          />
        </Grid2>

        {/* Optional instructions */}
        <Grid2 size={{xs:12}}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Dodatkowe wskazówki (opcjonalne)"
            error={!!errors.instructions}
            helperText={errors.instructions?.message}
            {...register('instructions')}
          />
        </Grid2>
      </Grid2>
    </Box>
  );
}
