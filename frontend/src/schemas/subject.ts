import { z } from 'zod';

export const SubjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  is_custom: z.boolean(),
  created_at: z.string().datetime(),
});

export const CreateSubjectSchema = z.object({
  name: z.string()
    .min(2, 'Minimum 2 znaki')
    .max(255)
    .regex(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9 -]+$/, 'Dozwolone: litery, cyfry, spacje, myślniki'),
});

export type CreateSubjectRequest = z.infer<typeof CreateSubjectSchema>;
