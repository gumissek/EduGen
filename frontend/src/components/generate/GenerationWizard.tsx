'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GenerationParamsSchema, GenerationParamsForm } from '@/schemas/generation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useGenerations } from '@/hooks/useGenerations';

import StepContentType from './StepContentType';
import StepSubjectConfig from './StepSubjectConfig';
import StepQuestionConfig from './StepQuestionConfig';
import StepSourceFiles from './StepSourceFiles';
import StepReview from './StepReview';

const steps = ['Typ treści', 'Przedmiot i klasa', 'Pytania', 'Pliki źródłowe', 'Podsumowanie'];

const defaultValues: Partial<GenerationParamsForm> = {
  content_type: 'worksheet',
  education_level: 'primary',
  class_level: 4,
  difficulty: 2,
  total_questions: 10,
  open_questions: 0,
  closed_questions: 10,
  variants_count: 1,
  source_file_ids: [],
};

export default function GenerationWizard() {
  const [activeStep, setActiveStep] = React.useState(0);
  const [draft, setDraft, removeDraft] = useLocalStorage<Partial<GenerationParamsForm>>('edugen-generation-draft', defaultValues);
  
  const methods = useForm<GenerationParamsForm>({
    resolver: zodResolver(GenerationParamsSchema),
    defaultValues: draft,
    mode: 'onTouched',
  });

  const { handleSubmit, trigger, watch } = methods;
  const { createGeneration, isCreating } = useGenerations();

  // Save draft on change
  React.useEffect(() => {
    const subscription = watch((value) => {
      setDraft(value as Partial<GenerationParamsForm>);
    });
    return () => subscription.unsubscribe();
  }, [watch, setDraft]);

  const handleNext = async () => {
    // Validate current step before proceeding
    let fieldsToValidate: any[] = [];
    if (activeStep === 0) fieldsToValidate = ['content_type'];
    if (activeStep === 1) fieldsToValidate = ['subject_id', 'education_level', 'class_level', 'topic'];
    if (activeStep === 2) fieldsToValidate = ['total_questions', 'open_questions', 'closed_questions', 'difficulty', 'variants_count', 'instructions'];
    
    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const onSubmit = async (data: GenerationParamsForm) => {
    await createGeneration(data as any);
    removeDraft();
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ minHeight: 300, py: 2 }}>
            {activeStep === 0 && <StepContentType />}
            {activeStep === 1 && <StepSubjectConfig />}
            {activeStep === 2 && <StepQuestionConfig />}
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
            
            {activeStep === steps.length - 1 ? (
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={isCreating}
                startIcon={isCreating && <CircularProgress size={20} color="inherit" />}
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
    </Paper>
  );
}
