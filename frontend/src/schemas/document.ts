import { z } from 'zod';
import { SubjectSchema } from './subject';

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  subject_id: z.string().uuid(),
  title: z.string(),
  content_type: z.enum(['worksheet', 'test', 'quiz', 'exam', 'lesson_materials']),
  content: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  
  // Optional relations
  subject: SubjectSchema.optional(),
});

export type Document = z.infer<typeof DocumentSchema>;
