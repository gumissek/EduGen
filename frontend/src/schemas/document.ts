import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  generation_id: z.string().uuid(),
  subject_id: z.string(),
  title: z.string(),
  content_type: z.string(),
  content: z.string().optional(),
  filename: z.string(),
  variants_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Document = z.infer<typeof DocumentSchema>;
