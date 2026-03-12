import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().email('Podaj poprawny adres e-mail'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z
  .object({
    email: z.string().email('Podaj poprawny adres e-mail'),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Hasła nie są identyczne',
    path: ['confirm_password'],
  });

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('bearer'),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
