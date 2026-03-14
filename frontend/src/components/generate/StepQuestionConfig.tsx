"use client";

import * as React from "react";
import { Controller, useFormContext, type FieldError } from "react-hook-form";
import Grid2 from "@mui/material/Grid2";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import { alpha } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { GenerationParamsFormInput } from "@/schemas/generation";
import { useTaskTypes } from "@/hooks/useTaskTypes";

const filter = createFilterOptions<string>();

const DIFFICULTY_MARKS = [
  { value: 1, label: "Bardzo łatwy" },
  { value: 2, label: "Łatwy" },
  { value: 3, label: "Średni" },
  { value: 4, label: "Trudny" },
  { value: 5, label: "Bardzo trudny" },
];

const DIFFICULTY_DOT_MARKS = [
  { value: 1 },
  { value: 2 },
  { value: 3 },
  { value: 4 },
  { value: 5 },
];

const QUICK_TASK_TYPES = [
  "Dopasowywanie",
  "Prawda/Fałsz",
  "Wielokrotny wybór",
  "Jednokrotny wybór",
  "Krótka odpowiedź",
  "Uzupełnianie luk",
];

const sectionSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  borderColor: "divider",
  backgroundColor: "background.paper",
};

const numberInputSx = {
  "& input[type=number]": {
    MozAppearance: "textfield",
  },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
    {
      WebkitAppearance: "none",
      margin: 0,
    },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getDifficultyLabel = (value: number) =>
  DIFFICULTY_MARKS.find((mark) => mark.value === value)?.label ?? "Łatwy";

const getTaskWord = (count: number) => {
  if (count === 1) return "zadanie";
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return "zadania";
  }

  return "zadań";
};

const getFriendlyErrorMessage = (error?: FieldError) => {
  if (!error?.message) return "";

  const message = error.message.toString();

  if (message.includes("expected number")) return "To pole jest wymagane.";
  if (message.includes("received undefined")) return "To pole jest wymagane.";
  if (message.includes("received nan")) return "Podaj poprawną liczbę.";
  if (message.includes("musi być liczbą")) return "Podaj poprawną liczbę.";
  if (message.includes("required")) return "To pole jest wymagane.";

  return message;
};

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

type CountFieldName = "total_questions" | "open_questions" | "closed_questions";

type ControlledNumberFieldProps = {
  name: CountFieldName;
  label: string;
  min: number;
  max?: number;
  helperText: string;
  triggerFields?: CountFieldName[];
};

type NumberFieldInnerProps = {
  value: string | number | undefined | null;
  onChange: (value: string | number | undefined) => void;
  onBlur: () => void;
  error?: FieldError;
  showError: boolean;
  label: string;
  min: number;
  max?: number;
  helperText: string;
  triggerFields?: CountFieldName[];
};

function NumberFieldInner({
  value,
  onChange,
  onBlur,
  error,
  showError,
  label,
  min,
  max,
  helperText,
  triggerFields,
}: NumberFieldInnerProps) {
  const { trigger } = useFormContext<GenerationParamsFormInput>();
  const [inputValue, setInputValue] = React.useState(
    value === undefined || value === null ? "" : String(value),
  );

  React.useEffect(() => {
    const next = value === undefined || value === null ? "" : String(value);
    setInputValue(next);
  }, [value]);

  return (
    <TextField
      fullWidth
      type="number"
      label={label}
      value={inputValue}
      onChange={(event) => {
        setInputValue(event.target.value);
      }}
      onBlur={() => {
        const trimmed = inputValue.trim();

        if (trimmed === "") {
          onChange(undefined);
        } else {
          const parsed = Number(trimmed);
          onChange(Number.isNaN(parsed) ? undefined : parsed);
        }

        onBlur();

        if (triggerFields?.length) {
          void trigger([...triggerFields, "task_types"]);
        }
      }}
      error={showError}
      helperText={showError ? getFriendlyErrorMessage(error) : helperText}
      sx={numberInputSx}
      inputProps={{
        min,
        ...(max !== undefined ? { max } : {}),
        inputMode: "numeric",
      }}
    />
  );
}

function ControlledNumberField({
  name,
  label,
  min,
  max,
  helperText,
  triggerFields,
}: ControlledNumberFieldProps) {
  const {
    control,
    formState: { submitCount },
  } = useFormContext<GenerationParamsFormInput>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const showError =
          !!fieldState.error && (fieldState.isTouched || submitCount > 0);

        return (
          <NumberFieldInner
            value={field.value as string | number | undefined}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error}
            showError={showError}
            label={label}
            min={min}
            max={max}
            helperText={helperText}
            triggerFields={triggerFields}
          />
        );
      }}
    />
  );
}

type StepperFieldProps = {
  value: number;
  min: number;
  max: number;
  error?: boolean;
  helperText?: React.ReactNode;
  onChange: (value: number) => void;
};

function StepperField({
  value,
  min,
  max,
  error,
  helperText,
  onChange,
}: StepperFieldProps) {
  const decreaseDisabled = value <= min;
  const increaseDisabled = value >= max;

  return (
    <TextField
      fullWidth
      type="number"
      label="Liczba wariantów"
      value={value}
      error={error}
      helperText={helperText}
      onChange={(event) => {
        const raw = event.target.value;

        if (raw === "") {
          onChange(min);
          return;
        }

        const next = Number(raw);
        onChange(clamp(Number.isNaN(next) ? min : next, min, max));
      }}
      sx={numberInputSx}
      inputProps={{
        min,
        max,
        inputMode: "numeric",
        style: { textAlign: "center" },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Tooltip title="Zmniejsz">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onChange(clamp(value - 1, min, max))}
                  disabled={decreaseDisabled}
                >
                  <RemoveRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title="Zwiększ">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onChange(clamp(value + 1, min, max))}
                  disabled={increaseDisabled}
                >
                  <AddRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
}

export default function StepQuestionConfig() {
  const {
    watch,
    control,
    setValue,
    clearErrors,
    trigger,
    formState: { errors, touchedFields, submitCount },
  } = useFormContext<GenerationParamsFormInput>();

  const { taskTypes = [], createTaskType } = useTaskTypes();

  const totalQuestionsRaw = watch("total_questions");
  const openQuestionsRaw = watch("open_questions");
  const closedQuestionsRaw = watch("closed_questions");
  const difficultyRaw = watch("difficulty");
  const selectedTaskTypes = (
    (watch("task_types") as string[] | undefined) ?? []
  ).filter(Boolean);

  const totalQuestions = parseNumber(totalQuestionsRaw) ?? 0;
  const openQuestions = parseNumber(openQuestionsRaw) ?? 0;
  const closedQuestions = parseNumber(closedQuestionsRaw) ?? 0;
  const difficulty = parseNumber(difficultyRaw) ?? 2;

  const assignedQuestions = openQuestions + closedQuestions;
  const remainingQuestions = Math.max(totalQuestions - assignedQuestions, 0);
  const hasOpenOrClosed = openQuestions > 0 || closedQuestions > 0;
  const hasTaskTypes = selectedTaskTypes.length > 0;

  const countsTouched =
    !!touchedFields.total_questions ||
    !!touchedFields.open_questions ||
    !!touchedFields.closed_questions ||
    !!touchedFields.task_types ||
    submitCount > 0 ||
    totalQuestionsRaw !== undefined ||
    openQuestionsRaw !== undefined ||
    closedQuestionsRaw !== undefined ||
    selectedTaskTypes.length > 0;

  const allCountsFilled =
    totalQuestionsRaw !== undefined &&
    openQuestionsRaw !== undefined &&
    closedQuestionsRaw !== undefined;

  const invalidTotal =
    allCountsFilled && (totalQuestions < 1 || totalQuestions > 50);
  const invalidDistribution =
    allCountsFilled && assignedQuestions > totalQuestions;
  const invalidMinimumSelection =
    allCountsFilled &&
    !invalidTotal &&
    !invalidDistribution &&
    !hasOpenOrClosed &&
    !hasTaskTypes;

  const showSectionState = countsTouched;

  const taskTypeOptions = React.useMemo(
    () => Array.from(new Set([...QUICK_TASK_TYPES, ...taskTypes])),
    [taskTypes],
  );

  const sectionErrorMessage =
    (errors.open_questions?.message as string | undefined) ||
    (errors.closed_questions?.message as string | undefined) ||
    (errors.task_types?.message as string | undefined);

  const toggleQuickTaskType = async (taskType: string) => {
    const exists = selectedTaskTypes.includes(taskType);
    const nextValue = exists
      ? selectedTaskTypes.filter((item) => item !== taskType)
      : [...selectedTaskTypes, taskType];

    setValue("task_types", nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    if (nextValue.length > 0) {
      clearErrors(["open_questions", "closed_questions", "task_types"]);
    }

    await trigger([
      "total_questions",
      "open_questions",
      "closed_questions",
      "task_types",
    ]);
  };

  const distributionMessage = (() => {
    if (!showSectionState) {
      return "Podaj liczbę wszystkich zadań, liczbę otwartych i zamkniętych oraz opcjonalnie wybierz typy zadań.";
    }

    if (!allCountsFilled) {
      const missing: string[] = [];

      if (totalQuestionsRaw === undefined)
        missing.push("liczbę wszystkich zadań");
      if (openQuestionsRaw === undefined)
        missing.push("liczbę zadań otwartych");
      if (closedQuestionsRaw === undefined)
        missing.push("liczbę zadań zamkniętych");

      if (missing.length === 1) {
        return `Uzupełnij ${missing[0]}.`;
      }

      if (missing.length === 2) {
        return `Uzupełnij ${missing[0]} i ${missing[1]}.`;
      }

      return "Uzupełnij brakujące pola.";
    }

    if (invalidTotal) {
      return "Liczba zadań ogółem musi być większa od 0 i nie może przekraczać 50.";
    }

    if (invalidDistribution) {
      return `Masz przypisane o ${assignedQuestions - totalQuestions} ${getTaskWord(
        assignedQuestions - totalQuestions,
      )} za dużo.`;
    }

    if (sectionErrorMessage) {
      return sectionErrorMessage;
    }

    if (assignedQuestions < totalQuestions) {
      if (hasTaskTypes) {
        return `Masz przypisane ${assignedQuestions} z ${totalQuestions} zadań. Pozostałe ${remainingQuestions} ${getTaskWord(
          remainingQuestions,
        )} mogą zostać dopasowane na podstawie wybranych typów zadań.`;
      }

      return `Masz przypisane ${assignedQuestions} z ${totalQuestions} zadań.`;
    }

    return "Konfiguracja zadań jest poprawna.";
  })();

  const showWarningAlert =
    showSectionState &&
    (!allCountsFilled ||
      invalidTotal ||
      invalidDistribution ||
      invalidMinimumSelection ||
      !!sectionErrorMessage);

  const showSuccessChip =
    allCountsFilled &&
    !invalidTotal &&
    !invalidDistribution &&
    !invalidMinimumSelection &&
    !sectionErrorMessage;

  return (
    <Box>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
            Parametry pytań i zadań
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ustaw liczbę zadań, sposób ich podziału, typy oraz wskazówki dla AI.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={sectionSx}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ChecklistRoundedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Liczba zadań
              </Typography>
            </Stack>

            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <ControlledNumberField
                  name="total_questions"
                  label="Liczba zadań ogółem"
                  min={0}
                  max={50}
                  helperText="Podaj liczbę od 1 do 50."
                  triggerFields={[
                    "total_questions",
                    "open_questions",
                    "closed_questions",
                  ]}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, md: 4 }}>
                <ControlledNumberField
                  name="open_questions"
                  label="Zadania otwarte"
                  min={0}
                  max={50}
                  helperText="Może być 0."
                  triggerFields={[
                    "total_questions",
                    "open_questions",
                    "closed_questions",
                  ]}
                />
              </Grid2>

              <Grid2 size={{ xs: 12, md: 4 }}>
                <ControlledNumberField
                  name="closed_questions"
                  label="Zadania zamknięte"
                  min={0}
                  max={50}
                  helperText="Może być 0."
                  triggerFields={[
                    "total_questions",
                    "open_questions",
                    "closed_questions",
                  ]}
                />
              </Grid2>

              <Grid2 size={{ xs: 12 }}>
                <Box
                  sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 2.5,
                    border: "1px solid",
                    borderColor: showWarningAlert
                      ? theme.palette.warning.main
                      : showSuccessChip
                        ? theme.palette.success.main
                        : theme.palette.divider,
                    backgroundColor: showWarningAlert
                      ? alpha(theme.palette.warning.main, 0.08)
                      : showSuccessChip
                        ? alpha(theme.palette.success.main, 0.08)
                        : alpha(theme.palette.primary.main, 0.03),
                  })}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Otwarte: ${openQuestions}`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Zamknięte: ${closedQuestions}`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Razem: ${assignedQuestions}`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Wszystkie: ${totalQuestions}`}
                      />
                    </Stack>

                    {showSuccessChip ? (
                      <Chip
                        size="small"
                        color="success"
                        label="Konfiguracja poprawna"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {distributionMessage}
                      </Typography>
                    )}
                  </Stack>

                  {showWarningAlert && (
                    <Alert
                      severity="warning"
                      sx={{
                        mt: 1.5,
                        borderRadius: 2,
                        "& .MuiAlert-message": { width: "100%" },
                      }}
                    >
                      {distributionMessage}
                    </Alert>
                  )}
                </Box>
              </Grid2>
            </Grid2>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={sectionSx}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TuneRoundedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Typy zadań
              </Typography>
            </Stack>

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.25 }}
              >
                Szybki wybór najczęściej używanych typów:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {QUICK_TASK_TYPES.map((taskType) => {
                  const isActive = selectedTaskTypes.includes(taskType);

                  return (
                    <Chip
                      key={taskType}
                      label={taskType}
                      clickable
                      color={isActive ? "primary" : "default"}
                      variant={isActive ? "filled" : "outlined"}
                      onClick={() => void toggleQuickTaskType(taskType)}
                    />
                  );
                })}
              </Stack>
            </Box>

            <Divider />

            <Controller
              name="task_types"
              control={control}
              defaultValue={[]}
              render={({ field, fieldState }) => {
                const showError =
                  !!fieldState.error &&
                  (fieldState.isTouched || submitCount > 0);

                return (
                  <Autocomplete
                    {...field}
                    multiple
                    freeSolo
                    options={taskTypeOptions}
                    value={(field.value as string[] | undefined) || []}
                    filterOptions={(options, params) => {
                      const filtered = filter(options, params);
                      const inputValue = params.inputValue.trim();
                      const isExisting = options.some(
                        (option) =>
                          option.toLowerCase() === inputValue.toLowerCase(),
                      );

                      if (inputValue !== "" && !isExisting) {
                        filtered.push(`Dodaj: "${inputValue}"`);
                      }

                      return filtered;
                    }}
                    getOptionLabel={(option) => {
                      if (
                        typeof option === "string" &&
                        option.startsWith('Dodaj: "')
                      ) {
                        return option.substring(8, option.length - 1);
                      }

                      return option;
                    }}
                    onChange={async (_, newValue) => {
                      const processedValues: string[] = [];

                      for (let value of newValue) {
                        if (
                          typeof value === "string" &&
                          value.startsWith('Dodaj: "')
                        ) {
                          value = value.substring(8, value.length - 1);
                        }

                        const normalized = value.trim();

                        if (!normalized) continue;

                        if (
                          !taskTypes.some(
                            (taskType) =>
                              taskType.toLowerCase() ===
                              normalized.toLowerCase(),
                          )
                        ) {
                          try {
                            await createTaskType(normalized);
                          } catch (error) {
                            console.error("Failed to create task type", error);
                          }
                        }

                        if (
                          !processedValues.some(
                            (taskType) =>
                              taskType.toLowerCase() ===
                              normalized.toLowerCase(),
                          )
                        ) {
                          processedValues.push(normalized);
                        }
                      }

                      field.onChange(processedValues);

                      if (processedValues.length > 0) {
                        clearErrors([
                          "open_questions",
                          "closed_questions",
                          "task_types",
                        ]);
                      }

                      await trigger([
                        "total_questions",
                        "open_questions",
                        "closed_questions",
                        "task_types",
                      ]);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Typy zadań"
                        placeholder="Wybierz z listy lub wpisz własny typ"
                        error={showError}
                        helperText={
                          showError
                            ? getFriendlyErrorMessage(fieldState.error)
                            : "Pole opcjonalne. Możesz zostawić puste."
                        }
                      />
                    )}
                  />
                );
              }}
            />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={sectionSx}>
          <Grid2 container spacing={3} alignItems="stretch">
            {/* Sekcja: Poziom trudności */}
            <Grid2 size={{ xs: 12, md: 9 }}>
              <Stack spacing={2.5} sx={{ height: "100%" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AutoAwesomeRoundedIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Poziom trudności
                  </Typography>
                </Stack>

                <Box
                  sx={(theme) => ({
                    p: 2,
                    borderRadius: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: alpha(theme.palette.primary.main, 0.03),
                    height: "100%",
                  })}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    sx={{ mb: 2 }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        Aktualne ustawienie
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {getDifficultyLabel(difficulty)}
                      </Typography>
                    </Box>

                    <Chip
                      color="primary"
                      variant="outlined"
                      label={`Poziom ${difficulty}/5`}
                    />
                  </Stack>

                  <Controller
                    name="difficulty"
                    control={control}
                    render={({ field, fieldState }) => {
                      const showError =
                        !!fieldState.error &&
                        (fieldState.isTouched || submitCount > 0);

                      const sliderValue = Number(parseNumber(field.value) ?? 2);

                      return (
                        <>
                          {/* --- WIDOK DESKTOP: SLIDER (widoczny od breakpointu 'md') --- */}
                          <Box
                            sx={{
                              display: { xs: "none", md: "block" }, // Ukryte na mobile, widoczne na desktopie
                              px: { xs: 2, md: 4 },
                              pt: 1,
                              pb: 4.5,
                              position: "relative",
                            }}
                          >
                            <Slider
                              value={sliderValue}
                              onChange={(_, value) =>
                                field.onChange(value as number)
                              }
                              min={1}
                              max={5}
                              step={1}
                              marks={DIFFICULTY_DOT_MARKS}
                              valueLabelDisplay="auto"
                              valueLabelFormat={(value) =>
                                getDifficultyLabel(Number(value))
                              }
                              aria-label="Poziom trudności AI"
                            />

                            <Box
                              sx={{
                                position: "absolute",
                                left: { xs: 18, md: 30 },
                                right: { xs: 18, md: 30 },
                                bottom: 0,
                                height: 22,
                                pointerEvents: "none",
                              }}
                            >
                              {DIFFICULTY_MARKS.map((mark, index) => (
                                <Typography
                                  key={mark.value}
                                  variant="caption"
                                  color={
                                    difficulty === mark.value
                                      ? "text.primary"
                                      : "text.secondary"
                                  }
                                  sx={{
                                    position: "absolute",
                                    left: `${index * 25}%`,
                                    transform: "translateX(-50%)",
                                    fontSize: { xs: 10, md: 12 },
                                    fontWeight:
                                      difficulty === mark.value ? 700 : 500,
                                    lineHeight: 1.2,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {mark.label}
                                </Typography>
                              ))}
                            </Box>
                          </Box>

                          {/* --- WIDOK MOBILE: STEPPER (widoczny do breakpointu 'md') --- */}
                          <Box
                            sx={{ display: { xs: "block", md: "none" }, pt: 1 }}
                          >
                            <StepperField
                              value={sliderValue}
                              min={1}
                              max={5}
                              error={showError}
                              helperText={
                                showError
                                  ? getFriendlyErrorMessage(fieldState.error)
                                  : undefined
                              }
                              onChange={(nextValue) =>
                                field.onChange(nextValue)
                              }
                            />
                          </Box>

                          {/* Komunikat o błędzie dla Slidera na Desktopie (Stepper wyświetla swój we własnym helperText) */}
                          {showError && (
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{
                                mt: 1,
                                display: { xs: "none", md: "block" },
                              }}
                            >
                              {getFriendlyErrorMessage(fieldState.error)}
                            </Typography>
                          )}
                        </>
                      );
                    }}
                  />
                </Box>
              </Stack>
            </Grid2>

            {/* Sekcja: Warianty (Bez zmian) */}
            <Grid2 size={{ xs: 12, md: 3 }}>
              <Stack spacing={2} sx={{ height: "100%" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <InfoOutlinedIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Warianty
                  </Typography>
                </Stack>

                <Controller
                  name="variants_count"
                  control={control}
                  defaultValue={1}
                  render={({ field, fieldState }) => {
                    const showError =
                      !!fieldState.error &&
                      (fieldState.isTouched || submitCount > 0);
                    const value = clamp(parseNumber(field.value) ?? 1, 1, 6);

                    return (
                      <StepperField
                        value={value}
                        min={1}
                        max={6}
                        error={showError}
                        helperText={
                          showError
                            ? getFriendlyErrorMessage(fieldState.error)
                            : "1 = jedna wersja, 2 = A/B, 3 = A/B/C, maksymalnie 6."
                        }
                        onChange={(nextValue) => field.onChange(nextValue)}
                      />
                    );
                  }}
                />

                <Box
                  sx={(theme) => ({
                    p: 1.25,
                    borderRadius: 1,
                    border: "1px dashed",
                    borderColor: "divider",
                    backgroundColor: alpha(theme.palette.text.primary, 0.02),
                  })}
                >
                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: 11,
                      lineHeight: 1.4,
                    }}
                  >
                    Przy większej liczbie wariantów AI generuje zestawy o
                    podobnym poziomie trudności.
                  </Typography>
                </Box>
              </Stack>
            </Grid2>
          </Grid2>
        </Paper>

        <Paper variant="outlined" sx={sectionSx}>
          <Stack spacing={2.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Materiały i instrukcje
            </Typography>

            <Controller
              name="instructions"
              control={control}
              render={({ field, fieldState }) => {
                const showError =
                  !!fieldState.error &&
                  (fieldState.isTouched || submitCount > 0);

                return (
                  <TextField
                    fullWidth
                    multiline
                    minRows={5}
                    label="Materiały, instrukcje i uwagi dla AI"
                    placeholder="np. używaj prostego, zrozumiałego języka; dodaj krótkie wyjaśnienia i 1 praktyczne zadanie lub przykład związany z tematem."
                    value={(field.value as string | undefined) ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={showError}
                    helperText={
                      showError
                        ? getFriendlyErrorMessage(fieldState.error)
                        : "To pole jest opcjonalne, ale konkretne wskazówki zwykle poprawiają jakość wygenerowanych zadań."
                    }
                  />
                );
              }}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
