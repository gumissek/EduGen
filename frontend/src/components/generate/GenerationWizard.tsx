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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SchoolIcon from '@mui/icons-material/School';
import NextLink from 'next/link';
import Typography from '@mui/material/Typography';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
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

  const { handleSubmit, trigger, setValue } = methods;
  const { createGeneration, isCreating } = useGenerations();

  // useWatch is compatible with React Compiler (unlike watch() from useForm)
  const formValues = useWatch({ control: methods.control }) as Partial<GenerationParamsForm>;
  const contentType = formValues.content_type ?? 'worksheet';
  const educationLevel = formValues.education_level ?? '';
  const classLevel = formValues.class_level ?? '';
  const isFreeForm = (TYPES_WITHOUT_QUESTIONS as readonly string[]).includes(contentType);
  const contentTypeLabel = CONTENT_TYPES.find(t => t.value === contentType)?.label;

  const { educationLevels } = useLevels();
  const educationLevelLabel = educationLevels.find(l => l.value === educationLevel)?.label || educationLevel;

  // Last content step index (4 total, but step 2 is skipped for free-form types)
  const lastStep = ALL_STEPS.length - 1;
  const isLastStep = activeStep === lastStep;

  // Save draft on change using useWatch (compatible with React Compiler)
  React.useEffect(() => {
    setDraft(formValues);
  }, [formValues, setDraft]);

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
    <Paper sx={{ 
      p: { xs: 2, sm: 3, md: 5 }, 
      borderRadius: '24px', 
      border: '1px solid', 
      borderColor: 'divider', 
      boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
      width: '100%',
      overflow: 'hidden' // Zabezpieczenie przed rozpychaniem przez zawartość
    }}>
      {/* Selected content type badge */}
      {activeStep > 0 && contentTypeLabel && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          gap: { xs: 1.5, sm: 2 }, 
          mb: { xs: 3, md: 4 }, 
          p: 2, 
          borderRadius: 3, 
          bgcolor: 'background.default', 
          border: 1, 
          borderColor: 'divider', 
          flexWrap: 'wrap' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex' }}>
               <AutoAwesomeIcon fontSize="small" />
            </Box>
            <Box>
              <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', display: 'block', lineHeight: 1, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Typ treści</Box>
              <Typography variant="body2" fontWeight="bold">{contentTypeLabel}</Typography>
            </Box>
          </Box>

          {activeStep > 1 && educationLevelLabel && (
            <>
              <Box sx={{ width: '1px', height: 32, bgcolor: 'divider', display: { xs: 'none', sm: 'block' } }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'secondary.main', color: 'secondary.contrastText', display: 'flex' }}>
                   <SchoolIcon fontSize="small" />
                </Box>
                <Box>
                  <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', display: 'block', lineHeight: 1, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Poziom edukacji</Box>
                  <Typography variant="body2" fontWeight="bold">{educationLevelLabel}</Typography>
                </Box>
              </Box>
            </>
          )}

          {activeStep > 1 && classLevel && (
            <>
              <Box sx={{ width: '1px', height: 32, bgcolor: 'divider', display: { xs: 'none', sm: 'block' } }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'info.main', color: 'info.contrastText', display: 'flex' }}>
                   <SchoolIcon fontSize="small" />
                </Box>
                <Box>
                  <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', display: 'block', lineHeight: 1, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Klasa / Semestr</Box>
                  <Typography variant="body2" fontWeight="bold">{classLevel}</Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* RWD: Zoptymalizowany wrapper scrollujący Stepper */}
      <Box sx={{ 
        width: { xs: 'calc(100% + 32px)', sm: '100%' }, // Poszerzenie o padding Paper na mobile
        mx: { xs: -2, sm: 0 }, // Ujemne marginesy dla scrollowania edge-to-edge
        px: { xs: 2, sm: 0 },  // Przywrócenie wewnętrznego paddingu
        overflowX: 'auto', 
        WebkitOverflowScrolling: 'touch', // Płynne przewijanie na iOS
        pb: 1,
        mb: { xs: 3, md: 5 },
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' }
      }}>
      <Stepper 
        activeStep={activeStep} 
        alternativeLabel 
        sx={{ 
          // Zapewnia, że stepper rozciągnie się do szerokości swoich dzieci (uruchamiając scroll w kontenerze)
          minWidth: { xs: 'max-content', sm: '100%' }, 
          
          // Nadajemy minimalną szerokość pojedynczemu krokowi, by zachować równe odstępy
          '& .MuiStep-root': {
            minWidth: { xs: '110px', sm: 'auto' },
          },
          
          '& .MuiStepLabel-label': { 
            fontWeight: 500, 
            mt: 1,
            // Mniejsza czcionka na mobile i blokada zawijania tekstu
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            whiteSpace: { xs: 'nowrap', sm: 'normal' }, 
          },
          '& .MuiStepLabel-label.Mui-active': { color: 'primary.main', fontWeight: 700 },
          '& .MuiStepLabel-label.Mui-completed': { color: 'text.primary', fontWeight: 600 },
          '& .MuiStepConnector-line': { borderColor: 'divider', borderWidth: 2, borderRadius: 1 },
        }}
      >
        {ALL_STEPS.map((label, index) => {
          const isSkipped = index === QUESTIONS_STEP && isFreeForm;
          return (
            <Step key={label} completed={activeStep > index && !isSkipped}>
              <StepLabel
                optional={
                  isSkipped ? (
                    <Typography 
                      component="span" 
                      color="error" 
                      sx={{ 
                        display: "block", // Upewniamy się, że to ląduje w nowej linii pod etykietą
                        textAlign: "center",
                        fontSize: { xs: "9px", sm: "11px" }, // Mniejsza uwaga na mobile
                        fontWeight: 600, 
                        letterSpacing: "0.02em",
                        mt: { xs: 0.5, sm: 0 }
                      }}
                    >
                      Nie dotyczy
                    </Typography>
                  ) : undefined
                }
                slotProps={{
                  stepIcon: isSkipped ? { style: { color: 'var(--mui-palette-divider)' } } : undefined
                }}
              >
                {label}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
      </Box>

      <FormProvider {...methods}>
        <form onSubmit={(e) => e.preventDefault()}>
          <Box sx={{ minHeight: 300, py: { xs: 1, sm: 2 } }}>
            {activeStep === 0 && <StepContentType />}
            {activeStep === 1 && <StepSubjectConfig />}
            {activeStep === 2 && !isFreeForm && <StepQuestionConfig />}
            {activeStep === 3 && <StepSourceFiles />}
            {activeStep === 4 && <StepReview />}
          </Box>

          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column-reverse', sm: 'row' }, 
            gap: { xs: 1.5, sm: 2 },
            pt: 3, 
            mt: { xs: 2, md: 4 }, 
            borderTop: 1, 
            borderColor: 'divider' 
          }}>
            <Button
              color="inherit"
              disabled={activeStep === 0 || isCreating}
              onClick={handleBack}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Wstecz
            </Button>
            
            <Box sx={{ flex: '1 1 auto', display: { xs: 'none', sm: 'block' } }} />
            
            {isLastStep ? (
              <Button 
                variant="contained" 
                color="primary"
                disabled={isCreating}
                onClick={handleGenerateClick}
                startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {isCreating ? 'Generowanie...' : 'Generuj materiał'}
              </Button>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleNext}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Dalej
              </Button>
            )}
          </Box>
        </form>
      </FormProvider>

      <Dialog open={confirmOpen} onClose={() => !isCreating && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          Potwierdź generowanie materiału
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz wygenerować materiał? Operacja wykorzysta tokeny OpenRouter i może zająć kilkanaście sekund.
            Po potwierdzeniu nastąpi przekierowanie do strony statusu generowania.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ 
          px: 3, 
          pb: 3, 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: { xs: 1.5, sm: 1 },
          '& > :not(style)': { m: '0 !important' } 
        }}>
          <Button 
            onClick={() => setConfirmOpen(false)} 
            disabled={isCreating} 
            color="inherit"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleConfirmGenerate}
            variant="contained"
            color="primary"
            disabled={isCreating}
            startIcon={isCreating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {isCreating ? 'Generowanie...' : 'Tak, generuj'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}