'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Chip from '@mui/material/Chip';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SchoolIcon from '@mui/icons-material/School';
import NextLink from 'next/link';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GenerationParamsSchema, GenerationParamsForm, TYPES_WITHOUT_QUESTIONS } from '@/schemas/generation';
import { GenerationParams } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useGenerations } from '@/hooks/useGenerations';
import { useSubjects } from '@/hooks/useSubjects';
import { useLevels } from '@/hooks/useLevels';
import { CONTENT_TYPES } from '@/lib/constants';

import StepContentType from './StepContentType';
import StepSubjectConfig from './StepSubjectConfig';
import StepQuestionConfig from './StepQuestionConfig';
import StepSourceFiles from './StepSourceFiles';
import StepReview from './StepReview';

// All wizard steps in order (index 2 = questions, may be skipped for some types)
const ALL_STEPS = ['Typ treści', 'Przedmiot i klasa', 'Pytania', 'Pliki źródłowe', 'Podsumowanie'];
const QUESTIONS_STEP = 2;

const defaultValues: Partial<GenerationParamsForm> = {
  content_type: 'worksheet',
  education_level: 'primary',
  class_level: 'Klasa 4',
  difficulty: 2,
  total_questions: 10,
  open_questions: 0,
  closed_questions: 10,
  variants_count: 1,
  task_types: [],
  source_file_ids: [],
};

export default function GenerationWizard() {
  const [activeStep, setActiveStep] = React.useState(0);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [draft, setDraft, removeDraft] = useLocalStorage<Partial<GenerationParamsForm>>('edugen-generation-draft', defaultValues);
  const { subjects, isLoading: subjectsLoading } = useSubjects();

  const methods = useForm<GenerationParamsForm>({
    resolver: zodResolver(GenerationParamsSchema),
    defaultValues: draft,
    mode: 'onTouched',
  });

  const { handleSubmit, trigger, watch, setValue } = methods;
  const { createGeneration, isCreating } = useGenerations();

  const contentType = watch('content_type');
  const educationLevel = watch('education_level');
  const classLevel = watch('class_level');
  const isFreeForm = (TYPES_WITHOUT_QUESTIONS as readonly string[]).includes(contentType);
  const contentTypeLabel = CONTENT_TYPES.find(t => t.value === contentType)?.label;

  const { educationLevels } = useLevels();
  const educationLevelLabel = educationLevels.find(l => l.value === educationLevel)?.label || educationLevel;

  // Last content step index (4 total, but step 2 is skipped for free-form types)
  const lastStep = ALL_STEPS.length - 1;
  const isLastStep = activeStep === lastStep;

  // Save draft on change
  React.useEffect(() => {
    const subscription = watch((value) => {
      setDraft(value as Partial<GenerationParamsForm>);
    });
    return () => subscription.unsubscribe();
  }, [watch, setDraft]);

  // When switching to a free-form type, zero out question fields
  React.useEffect(() => {
    if (isFreeForm) {
      setValue('total_questions', 0);
      setValue('open_questions', 0);
      setValue('closed_questions', 0);
      setValue('variants_count', 1);
      setValue('task_types', []);
    }
  }, [isFreeForm, setValue]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof GenerationParamsForm)[] = [];
    if (activeStep === 0) fieldsToValidate = ['content_type'];
    if (activeStep === 1) fieldsToValidate = ['subject_id', 'education_level', 'class_level', 'topic'];
    if (activeStep === QUESTIONS_STEP) fieldsToValidate = ['total_questions', 'open_questions', 'closed_questions', 'difficulty', 'variants_count'];

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }

    // Skip questions step (index 2) for free-form content types
    if (activeStep === 1 && isFreeForm) {
      setActiveStep(QUESTIONS_STEP + 1);
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    // Skip questions step when going back for free-form content types
    if (activeStep === QUESTIONS_STEP + 1 && isFreeForm) {
      setActiveStep(1);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleGenerateClick = () => setConfirmOpen(true);

  const handleConfirmGenerate = handleSubmit(async (data: GenerationParamsForm) => {
    setConfirmOpen(false);
    // Zero out question-related fields for free-form types before submitting
    const payload = { ...data } as GenerationParams;
    if ((TYPES_WITHOUT_QUESTIONS as readonly string[]).includes(data.content_type)) {
      payload.total_questions = 0;
      payload.open_questions = 0;
      payload.closed_questions = 0;
      payload.variants_count = 1;
      payload.difficulty = 1;
      payload.task_types = [];
    }
    await createGeneration(payload);
    removeDraft();
  });

  // No subjects yet – show blocking alert
  if (!subjectsLoading && subjects.length === 0) {
    return (
      <Alert
        severity="warning"
        icon={<FolderOpenIcon />}
        sx={{
          justifyContent: "center",
          textAlign: "center",
          "& .MuiAlert-message": {
            width: "100%"
          }
        }}
      >
        <AlertTitle sx={{ textAlign: "center" }}>
          Brak przedmiotów
        </AlertTitle>

        <Box>
          Aby wygenerować materiał, musisz najpierw dodać co najmniej jeden przedmiot.
        </Box> 

        <Box sx={{ mt: 1 }}>
          <Button
            component={NextLink}
            href="/subjects"
            color="inherit"
            size="small"
            variant="outlined"
          >
            Przejdź do Przedmiotów
          </Button>
        </Box>
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 4 }}>
      {/* Selected content type badge – visible after step 0 */}
      {activeStep > 0 && contentTypeLabel && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 1.5, borderRadius: 1, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon color="primary" fontSize="small" />
            <Box>
              <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', lineHeight: 1 }}>Typ treści</Box>
              <Chip label={contentTypeLabel} color="primary" size="small" sx={{ mt: 0.5 }} />
            </Box>
          </Box>

          {activeStep > 1 && educationLevelLabel && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon color="secondary" fontSize="small" />
              <Box>
                <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', lineHeight: 1 }}>Poziom edukacji</Box>
                <Chip label={educationLevelLabel} color="secondary" size="small" sx={{ mt: 0.5 }} />
              </Box>
            </Box>
          )}

          {activeStep > 1 && classLevel && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon color="info" fontSize="small" />
              <Box>
                <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', lineHeight: 1 }}>Klasa / Semestr</Box>
                <Chip label={classLevel} color="info" size="small" sx={{ mt: 0.5 }} />
              </Box>
            </Box>
          )}
        </Box>
      )}

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {ALL_STEPS.map((label, index) => {
          const isSkipped = index === QUESTIONS_STEP && isFreeForm;
          return (
            <Step key={label} completed={activeStep > index && !isSkipped}>
              <StepLabel
                optional={isSkipped ? <span style={{ fontSize: 11, color: '#aaa' }}>Nie dotyczy</span> : undefined}
                StepIconProps={isSkipped ? { style: { color: '#ccc' } } : undefined}
              >
                {label}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      <FormProvider {...methods}>
        <form onSubmit={(e) => e.preventDefault()}>
          <Box sx={{ minHeight: 300, py: 2 }}>
            {activeStep === 0 && <StepContentType />}
            {activeStep === 1 && <StepSubjectConfig />}
            {activeStep === 2 && !isFreeForm && <StepQuestionConfig />}
            {activeStep === 3 && <StepSourceFiles />}
            {activeStep === 4 && <StepReview />}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, mt: 4, borderTop: 1, borderColor: 'divider' }}>
            <Button
              color="inherit"
              disabled={activeStep === 0 || isCreating}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Wstecz
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            
            {isLastStep ? (
              <Button 
                variant="contained" 
                color="primary"
                disabled={isCreating}
                onClick={handleGenerateClick}
                startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
              >
                {isCreating ? 'Generowanie...' : 'Generuj materiał'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                Dalej
              </Button>
            )}
          </Box>
        </form>
      </FormProvider>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => !isCreating && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          Potwierdź generowanie materiału
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz wygenerować materiał? Operacja wykorzysta tokeny OpenAI i może zająć kilkanaście sekund.
            Po potwierdzeniu nastąpi przekierowanie do strony statusu generowania.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={isCreating} color="inherit">
            Anuluj
          </Button>
          <Button
            onClick={handleConfirmGenerate}
            variant="contained"
            color="primary"
            disabled={isCreating}
            startIcon={isCreating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
          >
            {isCreating ? 'Generowanie...' : 'Tak, generuj'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
