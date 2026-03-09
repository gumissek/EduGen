import { z } from 'zod';

export const SourceFileSchema = z.object({
  id: z.string().uuid(),
  subject_id: z.string().uuid(),
  filename: z.string(),
  file_type: z.string(),
  file_size: z.number(),
  summary: z.string().nullable(),
  has_extracted_text: z.boolean(),
  page_count: z.number().nullable(),
  created_at: z.string().datetime(),
});
