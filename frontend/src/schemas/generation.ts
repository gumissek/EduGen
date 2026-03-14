import { z } from 'zod';

export const TYPES_WITHOUT_QUESTIONS = ['worksheet', 'lesson_materials'] as const;

export const GenerationParamsSchema = z.object({
  content_type: z.enum(['worksheet', 'test', 'quiz', 'exam', 'lesson_materials']),
  subject_id: z.string().uuid(),
  // education_level accepts predefined values ('primary', 'secondary') or any custom string
  education_level: z.string().min(1, 'Poziom edukacji jest wymagany'),
  // class_level is a free-form string typed by the user (e.g. "Klasa 4", "Semestr 2", "Rok 1")
  class_level: z.string().min(1, 'Klasa / semestr jest wymagana').max(100),
  language_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).nullable().optional(),
  topic: z.string().min(1, 'Temat jest wymagany').max(500),
  instructions: z.string().max(2000).optional(),
  difficulty: z.number().int().min(1).max(4),
  total_questions: z.number().int().min(0).max(50),
  open_questions: z.number().int().min(0),
  closed_questions: z.number().int().min(0),
  variants_count: z.number().int().min(1).max(6),
  task_types: z.array(z.string()).optional(),
  source_file_ids: z.array(z.string().uuid()).optional(),
  curriculum_compliance_enabled: z.boolean().optional().default(false),
}).refine(
  (data) => {
    if ((TYPES_WITHOUT_QUESTIONS as readonly string[]).includes(data.content_type)) return true;
    
    const hasTotal = data.total_questions > 0;
    const hasOpen = data.open_questions > 0;
    const hasTaskTypes = data.task_types && data.task_types.length > 0;
    
    return hasTotal || hasOpen || hasTaskTypes;
  },
  { message: 'Należy podać liczbę zadań, liczbę pytań otwartych lub wybrać typy zadań', path: ['total_questions'] }
);

export type GenerationParamsForm = z.infer<typeof GenerationParamsSchema>;
