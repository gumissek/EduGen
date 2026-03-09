'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import { GenerationParamsForm, TYPES_WITHOUT_QUESTIONS } from '@/schemas/generation';
import { useSubjects } from '@/hooks/useSubjects';
import { useFiles } from '@/hooks/useFiles';
import { CONTENT_TYPES, DIFFICULTY_LEVELS } from '@/lib/constants';
import { useLevels } from '@/hooks/useLevels';
import { Subject, SourceFile } from '@/types';

export default function StepReview() {
  const { getValues } = useFormContext<GenerationParamsForm>();
  const values = getValues();
  const { subjects } = useSubjects();

  const { educationLevels } = useLevels();

  const contentTypeLabel = CONTENT_TYPES.find(c => c.value === values.content_type)?.label;
  const subjectName = subjects.find((s: Subject) => s.id === values.subject_id)?.name;
  const educationLevel = educationLevels.find(l => l.value === values.education_level)?.label || values.education_level;
  const difficultyLabel = DIFFICULTY_LEVELS.find(d => d.value === values.difficulty)?.label;

  const { files: allFiles } = useFiles(values.subject_id);
  const selectedFiles = (allFiles ?? []).filter((f: SourceFile) => (values.source_file_ids ?? []).includes(f.id));

  const isFreeForm = (TYPES_WITHOUT_QUESTIONS as readonly string[]).includes(values.content_type);
  const isWorksheet = values.content_type === 'worksheet';

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Podsumowanie konfiguracji
      </Typography>
      
      <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Typ materiału</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
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
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Przedmiot</Typography>
            <Typography variant="body1" fontWeight="medium">{subjectName}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Poziom edukacji</Typography>
            <Typography variant="body1" fontWeight="medium">{educationLevel}</Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">Klasa / Semestr</Typography>
            <Typography variant="body1" fontWeight="medium">{values.class_level}</Typography>
          </Grid>
          
          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Temat</Typography>
            <Typography variant="body1" fontWeight="medium">{values.topic}</Typography>
          </Grid>

          {values.instructions && (
            <>
              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Dodatkowe zalecenia</Typography>
                <Typography variant="body1" fontWeight="medium">{values.instructions}</Typography>
              </Grid>
            </>
          )}

          {!isFreeForm && (
            <>
              <Grid item xs={12}><Divider /></Grid>

              <Grid item xs={4} sm={3}>
                <Typography variant="caption" color="text.secondary">Łączna liczba pytań</Typography>
                <Typography variant="body1" fontWeight="medium">{values.total_questions}</Typography>
              </Grid>
              <Grid item xs={4} sm={3}>
                <Typography variant="caption" color="text.secondary">Pytania Otwarte | Zamknięte</Typography>
                <Typography variant="body1" fontWeight="medium">{values.open_questions} | {values.closed_questions}</Typography>
              </Grid>
              <Grid item xs={4} sm={3}>
                <Typography variant="caption" color="text.secondary">Trudność</Typography>
                <Typography variant="body1" fontWeight="medium">{difficultyLabel}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Liczba wariantów</Typography>
                <Typography variant="body1" fontWeight="medium">{values.variants_count}</Typography>
              </Grid>
            </>
          )}

          {isFreeForm && (
            <>
              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">Trudność</Typography>
                <Typography variant="body1" fontWeight="medium">{difficultyLabel}</Typography>
              </Grid>
            </>
          )}

          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12}>
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
          </Grid>
        </Grid>
      </Paper>
      
      <Typography variant="body2" color="text.secondary">
        Sprawdź powyższe dane. Jeśli wszystko się zgadza, kliknij "Generuj materiał", aby przeznaczyć zasoby OpenAI na wygenerowanie prototypu.
      </Typography>
    </Box>
  );
}
