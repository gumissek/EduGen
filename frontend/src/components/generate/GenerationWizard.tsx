"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SchoolIcon from "@mui/icons-material/School";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import NextLink from "next/link";
import Typography from "@mui/material/Typography";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  generationParamsSchema,
  GenerationParamsForm,
  GenerationParamsFormInput,
  TYPES_WITHOUT_QUESTIONS,
} from "@/schemas/generation";
import { GenerationParams } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useGenerations } from "@/hooks/useGenerations";
import { useSubjects } from "@/hooks/useSubjects";
import { useLevels } from "@/hooks/useLevels";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CONTENT_TYPES } from "@/lib/constants";

import StepContentType from "./StepContentType";
import StepSubjectConfig from "./StepSubjectConfig";
import StepQuestionConfig from "./StepQuestionConfig";
import StepSourceFiles from "./StepSourceFiles";
import StepReview from "./StepReview";

const ALL_STEPS = [
  "Typ treści",
  "Przedmiot i klasa",
  "Pytania",
  "Pliki źródłowe",
  "Podsumowanie",
];
const QUESTIONS_STEP = 2;

const defaultValues: GenerationParamsFormInput = {
  content_type: "worksheet",
  subject_id: "",
  education_level: "primary",
  class_level: "Klasa 4",
  topic: "",
  total_questions: 10,
  open_questions: 0,
  closed_questions: 10,
  difficulty: 2,
  variants_count: 1,
  task_types: [],
  source_file_ids: [],
  curriculum_compliance_enabled: false,
  instructions: "",
};

export default function GenerationWizard() {
  const [activeStep, setActiveStep, removeStep] = useLocalStorage<number>(
    "edugen-generation-step",
    0,
  );
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [draft, setDraft, removeDraft] =
    useLocalStorage<GenerationParamsFormInput>(
      "edugen-generation-draft",
      defaultValues,
    );

  const { subjects, isLoading: subjectsLoading } = useSubjects();
  const { user, isLoading: userLoading } = useCurrentUser();
  const { educationLevels } = useLevels();
  const { createGeneration, isCreating } = useGenerations();

  const methods = useForm<
    GenerationParamsFormInput,
    unknown,
    GenerationParamsForm
  >({
    resolver: zodResolver(generationParamsSchema),
    defaultValues: {
      ...defaultValues,
      ...draft,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    criteriaMode: "firstError",
    shouldFocusError: true,
  });

  const { handleSubmit, trigger, setValue, clearErrors, control } = methods;

  const watchedValues = useWatch<GenerationParamsFormInput>({
    control,
  });

  const formValues = React.useMemo<GenerationParamsFormInput>(
    () => ({
      ...defaultValues,
      ...(watchedValues as Partial<GenerationParamsFormInput>),
    }),
    [watchedValues],
  );

  const contentType = formValues.content_type;
  const educationLevel = formValues.education_level;
  const classLevel = formValues.class_level;
  const isFreeForm = TYPES_WITHOUT_QUESTIONS.includes(contentType);
  const contentTypeLabel = CONTENT_TYPES.find(
    (t) => t.value === contentType,
  )?.label;
  const educationLevelLabel =
    educationLevels.find((l) => l.value === educationLevel)?.label ||
    educationLevel;

  const lastStep = ALL_STEPS.length - 1;
  const isLastStep = activeStep === lastStep;

  React.useEffect(() => {
    setDraft(formValues);
  }, [formValues, setDraft]);

  React.useEffect(() => {
    if (!isFreeForm) return;

    setValue("total_questions", 0, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("open_questions", 0, { shouldDirty: true, shouldValidate: false });
    setValue("closed_questions", 0, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("variants_count", 1, { shouldDirty: true, shouldValidate: false });
    setValue("difficulty", 1, { shouldDirty: true, shouldValidate: false });
    setValue("task_types", [], { shouldDirty: true, shouldValidate: false });

    clearErrors([
      "total_questions",
      "open_questions",
      "closed_questions",
      "difficulty",
      "variants_count",
      "task_types",
    ]);
  }, [isFreeForm, setValue, clearErrors]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof GenerationParamsFormInput)[] = [];

    if (activeStep === 0) {
      fieldsToValidate = ["content_type"];
    }

    if (activeStep === 1) {
      fieldsToValidate = [
        "subject_id",
        "education_level",
        "class_level",
        "topic",
      ];
    }

    if (activeStep === QUESTIONS_STEP && !isFreeForm) {
      fieldsToValidate = [
        "total_questions",
        "open_questions",
        "closed_questions",
        "difficulty",
        "variants_count",
        "task_types",
      ];
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate, { shouldFocus: true });
      if (!isValid) return;
    }

    if (activeStep === 1 && isFreeForm) {
      setActiveStep(QUESTIONS_STEP + 1);
      return;
    }

    setActiveStep((prev) => Math.min(prev + 1, lastStep));
  };

  const handleBack = () => {
    if (activeStep === QUESTIONS_STEP + 1 && isFreeForm) {
      setActiveStep(1);
      return;
    }

    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleGenerateClick = () => setConfirmOpen(true);

  const handleConfirmGenerate = handleSubmit(async (data) => {
    setConfirmOpen(false);

    const payload = { ...data } as GenerationParams;

    if (TYPES_WITHOUT_QUESTIONS.includes(data.content_type)) {
      payload.total_questions = 0;
      payload.open_questions = 0;
      payload.closed_questions = 0;
      payload.variants_count = 1;
      payload.difficulty = 1;
      payload.task_types = [];
    }

    await createGeneration(payload);
    removeDraft();
    removeStep();
  });

  const canGenerate =
    userLoading || !user || user.has_secret_keys || user.api_quota > 0;

  if (!canGenerate) {
    return (
      <Alert
        severity="error"
        icon={<VpnKeyIcon />}
        sx={{
          justifyContent: "center",
          textAlign: "center",
          "& .MuiAlert-message": {
            width: "100%",
          },
        }}
      >
        <AlertTitle sx={{ textAlign: "center" }}>
          Brak dostępu do generowania
        </AlertTitle>

        <Box>
          Nie masz aktywnego klucza API OpenRouter ani dostępnej puli zapytań
          (quota). Aby generować materiały, dodaj własny klucz API lub
          skontaktuj się z administratorem w celu doładowania quota.
        </Box>

        <Box sx={{ mt: 1 }}>
          <Button
            component={NextLink}
            href="/settings"
            color="inherit"
            size="small"
            variant="outlined"
          >
            Przejdź do Ustawień
          </Button>
        </Box>
      </Alert>
    );
  }

  if (!subjectsLoading && subjects.length === 0) {
    return (
      <Alert
        severity="warning"
        icon={<FolderOpenIcon />}
        sx={{
          justifyContent: "center",
          textAlign: "center",
          "& .MuiAlert-message": {
            width: "100%",
          },
        }}
      >
        <AlertTitle sx={{ textAlign: "center" }}>Brak przedmiotów</AlertTitle>

        <Box>
          Aby wygenerować materiał, musisz najpierw dodać co najmniej jeden
          przedmiot.
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
    <Paper
      sx={{
        p: { xs: 2, sm: 3, md: 5 },
        borderRadius: "24px",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 4px 24px rgba(0,0,0,0.02)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {activeStep > 0 && contentTypeLabel && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            gap: { xs: 1.5, sm: 2 },
            mb: { xs: 3, md: 4 },
            p: 2,
            borderRadius: 3,
            bgcolor: "background.default",
            border: 1,
            borderColor: "divider",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
              }}
            >
              <AutoAwesomeIcon fontSize="small" />
            </Box>

            <Box>
              <Box
                component="span"
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "text.secondary",
                  display: "block",
                  lineHeight: 1,
                  mb: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Typ treści
              </Box>
              <Typography variant="body2" fontWeight="bold">
                {contentTypeLabel}
              </Typography>
            </Box>
          </Box>

          {activeStep > 1 && educationLevelLabel && (
            <>
              <Box
                sx={{
                  width: "1px",
                  height: 32,
                  bgcolor: "divider",
                  display: { xs: "none", sm: "block" },
                }}
              />

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: "secondary.main",
                    color: "secondary.contrastText",
                    display: "flex",
                  }}
                >
                  <SchoolIcon fontSize="small" />
                </Box>

                <Box>
                  <Box
                    component="span"
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "text.secondary",
                      display: "block",
                      lineHeight: 1,
                      mb: 0.5,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Poziom edukacji
                  </Box>
                  <Typography variant="body2" fontWeight="bold">
                    {educationLevelLabel}
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          {activeStep > 1 && classLevel && (
            <>
              <Box
                sx={{
                  width: "1px",
                  height: 32,
                  bgcolor: "divider",
                  display: { xs: "none", sm: "block" },
                }}
              />

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: "info.main",
                    color: "info.contrastText",
                    display: "flex",
                  }}
                >
                  <SchoolIcon fontSize="small" />
                </Box>

                <Box>
                  <Box
                    component="span"
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "text.secondary",
                      display: "block",
                      lineHeight: 1,
                      mb: 0.5,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Klasa / Semestr
                  </Box>
                  <Typography variant="body2" fontWeight="bold">
                    {classLevel}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      )}

      <Box
        sx={{
          width: { xs: "calc(100% + 32px)", sm: "100%" },
          mx: { xs: -2, sm: 0 },
          px: { xs: 2, sm: 0 },
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          pb: 1,
          mb: { xs: 3, md: 5 },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            minWidth: { xs: "max-content", sm: "100%" },
            "& .MuiStep-root": {
              minWidth: { xs: "110px", sm: "auto" },
            },
            "& .MuiStepLabel-label": {
              fontWeight: 500,
              mt: 1,
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              whiteSpace: { xs: "nowrap", sm: "normal" },
            },
            "& .MuiStepLabel-label.Mui-active": {
              color: "primary.main",
              fontWeight: 700,
            },
            "& .MuiStepLabel-label.Mui-completed": {
              color: "text.primary",
              fontWeight: 600,
            },
            "& .MuiStepConnector-line": {
              borderColor: "divider",
              borderWidth: 2,
              borderRadius: 1,
            },
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
                          display: "block",
                          textAlign: "center",
                          fontSize: { xs: "9px", sm: "11px" },
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                          mt: { xs: 0.5, sm: 0 },
                        }}
                      >
                        Nie dotyczy
                      </Typography>
                    ) : undefined
                  }
                  slotProps={{
                    stepIcon: isSkipped
                      ? { style: { color: "var(--mui-palette-divider)" } }
                      : undefined,
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
        <form onSubmit={(e) => e.preventDefault()} noValidate>
          <Box sx={{ minHeight: 300, py: { xs: 1, sm: 2 } }}>
            {activeStep === 0 && <StepContentType />}
            {activeStep === 1 && <StepSubjectConfig />}
            {activeStep === 2 && !isFreeForm && <StepQuestionConfig />}
            {activeStep === 3 && <StepSourceFiles />}
            {activeStep === 4 && <StepReview />}
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column-reverse", sm: "row" },
              gap: { xs: 1.5, sm: 2 },
              pt: 3,
              mt: { xs: 2, md: 4 },
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Button
              color="inherit"
              disabled={activeStep === 0 || isCreating}
              onClick={handleBack}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              Wstecz
            </Button>

            <Box
              sx={{ flex: "1 1 auto", display: { xs: "none", sm: "block" } }}
            />

            {isLastStep ? (
              <Button
                variant="contained"
                color="primary"
                disabled={isCreating}
                onClick={handleGenerateClick}
                startIcon={
                  isCreating ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <AutoAwesomeIcon />
                  )
                }
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {isCreating ? "Generowanie..." : "Generuj materiał"}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                Dalej
              </Button>
            )}
          </Box>
        </form>
      </FormProvider>

      <Dialog
        open={confirmOpen}
        onClose={() => !isCreating && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          Potwierdź generowanie materiału
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz wygenerować materiał? Operacja wykorzysta tokeny
            OpenRouter i może zająć kilkanaście sekund. Po potwierdzeniu nastąpi
            przekierowanie do strony statusu generowania.
          </DialogContentText>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1.5, sm: 1 },
            "& > :not(style)": { m: "0 !important" },
          }}
        >
          <Button
            onClick={() => setConfirmOpen(false)}
            disabled={isCreating}
            color="inherit"
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Anuluj
          </Button>

          <Button
            onClick={handleConfirmGenerate}
            variant="contained"
            color="primary"
            disabled={isCreating}
            startIcon={
              isCreating ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {isCreating ? "Generowanie..." : "Tak, generuj"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
