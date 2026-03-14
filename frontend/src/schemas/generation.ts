import { z } from "zod";

export const TYPES_WITHOUT_QUESTIONS: readonly string[] = ["lessonmaterials"];

const numberFromInput = (label: string, min: number, max: number) =>
  z
    .union([z.string(), z.number(), z.undefined(), z.null()])
    .transform((value, ctx) => {
      if (value === "" || value === null || value === undefined) {
        ctx.addIssue({
          code: "custom",
          message: `${label} jest wymagane.`,
        });
        return z.NEVER;
      }

      const parsed = typeof value === "number" ? value : Number(value);

      if (Number.isNaN(parsed)) {
        ctx.addIssue({
          code: "custom",
          message: `${label} musi być liczbą.`,
        });
        return z.NEVER;
      }

      return parsed;
    })
    .pipe(
      z
        .number()
        .int({ error: `${label} musi być liczbą całkowitą.` })
        .min(min, { error: `${label} musi być większe lub równe ${min}.` })
        .max(max, { error: `${label} musi być mniejsze lub równe ${max}.` }),
    );

export const generationParamsSchema = z
  .object({
    content_type: z.string().min(1, "Wybierz typ treści."),
    subject_id: z.string().min(1, "Wybierz przedmiot."),
    education_level: z.string().min(1, "Wybierz poziom edukacji."),
    class_level: z.string().min(1, "Wybierz klasę lub semestr."),
    topic: z
      .string()
      .trim()
      .min(1, "Temat jest wymagany.")
      .max(200, "Temat może mieć maksymalnie 200 znaków."),
    total_questions: numberFromInput("Liczba zadań ogółem", 0, 50),
    open_questions: numberFromInput("Liczba zadań otwartych", 0, 50),
    closed_questions: numberFromInput("Liczba zadań zamkniętych", 0, 50),
    difficulty: numberFromInput("Poziom trudności", 1, 5),
    variants_count: numberFromInput("Liczba wariantów", 1, 6),
    task_types: z.array(z.string().trim().min(1)).default([]),
    language_level: z.string().optional().or(z.literal("")),
    source_file_ids: z.array(z.string()).default([]),
    curriculum_compliance_enabled: z.boolean().default(false),
    include_compliance_card: z.boolean().default(false),
    curriculum_document_ids: z.array(z.string()).default([]),
    instructions: z
      .string()
      .max(2000, "Instrukcje mogą mieć maksymalnie 2000 znaków.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const isFreeForm = TYPES_WITHOUT_QUESTIONS.includes(data.content_type);

    if (isFreeForm) {
      return;
    }

    if (data.total_questions < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["total_questions"],
        message: "Liczba zadań ogółem musi być większa od 0.",
      });
    }

    const assignedQuestions = data.open_questions + data.closed_questions;
    const hasOpenOrClosed =
      data.open_questions > 0 || data.closed_questions > 0;
    const hasTaskTypes = data.task_types.length > 0;

    if (assignedQuestions > data.total_questions) {
      ctx.addIssue({
        code: "custom",
        path: ["closed_questions"],
        message:
          "Suma zadań otwartych i zamkniętych nie może być większa niż liczba wszystkich zadań.",
      });
    }

    if (!hasOpenOrClosed && !hasTaskTypes) {
      const message =
        "Dodaj co najmniej jedno zadanie otwarte lub jedno zadanie zamknięte, albo wybierz przynajmniej jeden typ zadania.";

      ctx.addIssue({
        code: "custom",
        path: ["open_questions"],
        message,
      });

      ctx.addIssue({
        code: "custom",
        path: ["closed_questions"],
        message,
      });

      ctx.addIssue({
        code: "custom",
        path: ["task_types"],
        message,
      });
    }
  });

export const GenerationParamsSchema = generationParamsSchema;

export type GenerationParamsFormInput = z.input<typeof generationParamsSchema>;
export type GenerationParamsForm = z.output<typeof generationParamsSchema>;
export type GenerationParamsFormOutput = GenerationParamsForm;
