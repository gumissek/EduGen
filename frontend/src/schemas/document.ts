import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  generation_id: z.string().uuid(),
  subject_id: z.string(),
  subject_name: z.string().optional().default(''),
  title: z.string(),
  content_type: z.string(),
  education_level: z.string().optional().default(''),
  class_level: z.string().optional().default(''),
  content: z.string().optional(),
  filename: z.string(),
  variants_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Document = z.infer<typeof DocumentSchema>;
