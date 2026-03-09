import { z } from 'zod';

export const LoginRequestSchema = z.object({
  password: z.string().min(1, 'Hasło jest wymagane'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string().uuid(),
  expires_at: z.string().datetime(),
  must_change_password: z.boolean().default(false),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const ChangePasswordRequestSchema = z.object({
  new_password: z
    .string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Hasła nie są identyczne',
  path: ['confirm_password'],
});

export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
