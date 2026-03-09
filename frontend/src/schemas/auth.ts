import { z } from 'zod';

export const LoginRequestSchema = z.object({
  password: z.string().min(1, 'Hasło jest wymagane'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string().uuid(),
  expires_at: z.string().datetime(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
