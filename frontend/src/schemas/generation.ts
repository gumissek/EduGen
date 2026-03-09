import { z } from 'zod';

export const GenerationParamsSchema = z.object({
  content_type: z.enum(['worksheet', 'test', 'quiz', 'exam', 'lesson_materials']),
  subject_id: z.string().uuid(),
  education_level: z.enum(['primary', 'secondary']),
  class_level: z.number().int().min(1).max(8),
  language_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).nullable().optional(),
  topic: z.string().min(1, 'Temat jest wymagany').max(500),
  instructions: z.string().max(2000).optional(),
  difficulty: z.number().int().min(1).max(4),
  total_questions: z.number().int().min(1).max(50),
  open_questions: z.number().int().min(0),
  closed_questions: z.number().int().min(0),
  variants_count: z.number().int().min(1).max(6),
  source_file_ids: z.array(z.string().uuid()).optional(),
}).refine(
  (data) => data.open_questions + data.closed_questions === data.total_questions,
  { message: 'Suma pytań otwartych i zamkniętych musi być równa łącznej liczbie pytań', path: ['total_questions'] }
).refine(
  (data) => {
    if (data.education_level === 'primary') return data.class_level >= 1 && data.class_level <= 8;
    return data.class_level >= 1 && data.class_level <= 4;
  },
  { message: 'Nieprawidłowy zakres klasy', path: ['class_level'] }
);

export type GenerationParamsForm = z.infer<typeof GenerationParamsSchema>;
