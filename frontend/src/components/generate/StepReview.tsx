'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid2 from '@mui/material/Grid2'; 
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import { GenerationParamsForm, TYPES_WITHOUT_QUESTIONS } from '@/schemas/generation';
import { useSubjects } from '@/hooks/useSubjects';
import { useFiles } from '@/hooks/useFiles';
import { CONTENT_TYPES, DIFFICULTY_LEVELS } from '@/lib/constants';
import { useLevels } from '@/hooks/useLevels';
import { Subject, SourceFile, CurriculumDocument } from '@/types';
import { useCurriculum } from '@/hooks/useCurriculum';

export default function StepReview() {
  const { getValues, setValue } = useFormContext<GenerationParamsForm>();
  const values = getValues();
  const { subjects } = useSubjects();
  const { documents: curriculumDocs } = useCurriculum();

  const { educationLevels } = useLevels();

  const contentTypeLabel = CONTENT_TYPES.find(c => c.value === values.content_type)?.label;
  const subjectName = subjects.find((s: Subject) => s.id === values.subject_id)?.name;
  const educationLevel = educationLevels.find(l => l.value === values.education_level)?.label || values.education_level;
  const difficultyLabel = DIFFICULTY_LEVELS.find(d => d.value === values.difficulty)?.label;

  const { files: allFiles } = useFiles(values.subject_id);
  const selectedFiles = (allFiles ?? []).filter((f: SourceFile) => (values.source_file_ids ?? []).includes(f.id));

  const isFreeForm = (TYPES_WITHOUT_QUESTIONS as readonly string[]).includes(values.content_type);
  const isWorksheet = values.content_type === 'worksheet';

  const readyCurriculumDocs = curriculumDocs.filter((d: CurriculumDocument) => d.status === 'ready');

  const [filterSubject, setFilterSubject] = React.useState('');
  const [filterYear, setFilterYear] = React.useState('');

  const availableSubjects = React.useMemo(
    () => Array.from(new Set(readyCurriculumDocs.map((d: CurriculumDocument) => d.subject_name).filter(Boolean))) as string[],
    [readyCurriculumDocs],
  );
  const availableYears = React.useMemo(
    () => Array.from(new Set(readyCurriculumDocs.map((d: CurriculumDocument) => d.curriculum_year).filter(Boolean))) as string[],
    [readyCurriculumDocs],
  );

  const filteredCurriculumDocs = readyCurriculumDocs.filter((d: CurriculumDocument) => {
    if (filterSubject && d.subject_name !== filterSubject) return false;
    if (filterYear && d.curriculum_year !== filterYear) return false;
    return true;
  });

  const handleToggleCurriculumDoc = (docId: string) => {
    const current = values.curriculum_document_ids ?? [];
    const next = current.includes(docId)
      ? current.filter((id: string) => id !== docId)
      : [...current, docId];
    setValue('curriculum_document_ids', next);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Podsumowanie konfiguracji</Typography>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, mb: 3, borderRadius: '24px', borderWidth: 1, borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(1, 72, 131, 0.01)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
        <Grid2 container spacing={2}>
          
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="caption" color="text.secondary">Typ materiału</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              <Typography variant="body1" fontWeight="medium">{contentTypeLabel}</Typography>
              {isFreeForm && (
                <Chip
                  size="small"
                  icon={isWorksheet ? <PersonIcon fontSize="small" /> : <SchoolIcon fontSize="small" />}
                  label={isWorksheet ? 'Dla uczniów' : 'Dla nauczyciela'}
                  color={isWorksheet ? 'primary' : 'secondary'}
                  variant="outlined"
                />
              )}
            </Box>
          </Grid2>
          
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="caption" color="text.secondary">Przedmiot</Typography>
            <Typography variant="body1" fontWeight="medium">{subjectName}</Typography>
          </Grid2>
          
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="caption" color="text.secondary">Poziom edukacji</Typography>
            <Typography variant="body1" fontWeight="medium">{educationLevel}</Typography>
          </Grid2>
          
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="caption" color="text.secondary">Klasa / Semestr</Typography>
            <Typography variant="body1" fontWeight="medium">{values.class_level}</Typography>
          </Grid2>
          
          <Grid2 size={12}><Divider /></Grid2>

          <Grid2 size={12}>
            <Typography variant="caption" color="text.secondary">Temat</Typography>
            <Typography variant="body1" fontWeight="medium">{values.topic}</Typography>
          </Grid2>

          {values.instructions && (
            <>
              <Grid2 size={12}><Divider /></Grid2>
              <Grid2 size={12}>
                <Typography variant="caption" color="text.secondary">Dodatkowe zalecenia</Typography>
                <Typography variant="body1" fontWeight="medium">{values.instructions}</Typography>
              </Grid2>
            </>
          )}

          {!isFreeForm && (
            <>
              <Grid2 size={12}><Divider /></Grid2>

              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Liczba zadań</Typography>
                <Typography variant="body1" fontWeight="medium">{values.total_questions}</Typography>
              </Grid2>
              
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Pytania Otwarte | Zamknięte</Typography>
                <Typography variant="body1" fontWeight="medium">{values.open_questions} | {values.closed_questions}</Typography>
              </Grid2>
              
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Trudność</Typography>
                <Typography variant="body1" fontWeight="medium">{difficultyLabel}</Typography>
              </Grid2>
              
              <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">Liczba wariantów</Typography>
                <Typography variant="body1" fontWeight="medium">{values.variants_count}</Typography>
              </Grid2>
              
              {values.task_types && values.task_types.length > 0 && (
                <Grid2 size={12} sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Wybrane typy zadań</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {values.task_types.map((type: string) => (
                      <Chip key={type} label={type} size="small" variant="outlined" color="primary" />
                    ))}
                  </Box>
                </Grid2>
              )}
            </>
          )}

          {isFreeForm && (
            <>
              <Grid2 size={12}><Divider /></Grid2>
              <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">Trudność</Typography>
                <Typography variant="body1" fontWeight="medium">{difficultyLabel}</Typography>
              </Grid2>
            </>
          )}

          <Grid2 size={12}><Divider /></Grid2>

          <Grid2 size={12}>
            <Typography variant="caption" color="text.secondary">Wybrane pliki źródłowe</Typography>
            {selectedFiles.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {selectedFiles.map((f: SourceFile) => (
                  <Chip key={f.id} label={f.filename} size="small" variant="outlined" />
                ))}
              </Box>
            ) : (
              <Typography variant="body1" fontWeight="medium">
                Brak (generowanie na bazie wiedzy własnej AI i instrukcji)
              </Typography>
            )}
          </Grid2>
          
        </Grid2>
      </Paper>

      {/* Curriculum compliance toggle */}
      {readyCurriculumDocs.length > 0 && !isFreeForm && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: '24px', borderColor: 'divider' }}>
          <FormControlLabel
            control={
              <Switch
                checked={values.curriculum_compliance_enabled ?? false}
                onChange={(e) => {
                  setValue('curriculum_compliance_enabled', e.target.checked);
                  if (!e.target.checked) {
                    setValue('include_compliance_card', false);
                    setValue('curriculum_document_ids', []);
                  }
                }}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  Weryfikuj zgodność z Podstawą Programową
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  System sprawdzi, czy wygenerowane pytania realizują odpowiednie wymagania z Podstawy Programowej dla wybranego poziomu edukacji i przedmiotu.
                </Typography>
              </Box>
            }
          />

          {values.curriculum_compliance_enabled && (
            <Box sx={{ mt: 2, pl: { xs: 0, sm: 2 } }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.include_compliance_card ?? false}
                    onChange={(e) => setValue('include_compliance_card', e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      Dołącz metryczkę zgodności
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Na końcu dokumentu zostanie dodana tabela mapująca zadania do punktów Podstawy Programowej i materiałów źródłowych.
                    </Typography>
                  </Box>
                }
              />

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                Dokumenty Podstawy Programowej
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Wybierz dokumenty, na podstawie których system będzie weryfikować zgodność. Jeśli nie wybierzesz żadnego, zostaną użyte wszystkie dostępne.
              </Typography>
              {/* Filters */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                {availableSubjects.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Przedmiot</InputLabel>
                    <Select
                      value={filterSubject}
                      label="Przedmiot"
                      onChange={(e) => setFilterSubject(e.target.value)}
                    >
                      <MenuItem value="">Wszystkie</MenuItem>
                      {availableSubjects.map((s) => (
                        <MenuItem key={s} value={s}>{s}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {availableYears.length > 1 && (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Rok PP</InputLabel>
                    <Select
                      value={filterYear}
                      label="Rok PP"
                      onChange={(e) => setFilterYear(e.target.value)}
                    >
                      <MenuItem value="">Wszystkie</MenuItem>
                      {availableYears.map((y) => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 200, overflowY: 'auto' }}>
                {filteredCurriculumDocs.map((doc: CurriculumDocument) => (
                  <FormControlLabel
                    key={doc.id}
                    control={
                      <Checkbox
                        checked={(values.curriculum_document_ids ?? []).includes(doc.id)}
                        onChange={() => handleToggleCurriculumDoc(doc.id)}
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="body2">{doc.original_filename}</Typography>
                        {doc.education_level && (
                          <Chip label={doc.education_level} size="small" variant="outlined" color="primary" />
                        )}
                        {doc.subject_name && (
                          <Chip label={doc.subject_name} size="small" variant="outlined" color="secondary" />
                        )}
                        {doc.curriculum_year && (
                          <Chip label={doc.curriculum_year} size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                  />
                ))}
                {filteredCurriculumDocs.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Brak dokumentów pasujących do wybranych filtrów.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      )}
      {readyCurriculumDocs.length === 0 && !isFreeForm && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Weryfikacja zgodności z PP niedostępna — brak dokumentów Podstawy Programowej w systemie.
        </Typography>
      )}
      
      <Typography variant="body2" color="text.secondary">
        Sprawdź powyższe dane. Jeśli wszystko się zgadza, kliknij &quot;Generuj materiał&quot;, aby rozpocząć generowanie prototypu przez AI.
      </Typography>
    </Box>
  );
}