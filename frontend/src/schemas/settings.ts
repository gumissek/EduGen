import { z } from 'zod';

export const SettingsResponseSchema = z.object({
  default_model: z.string(),
  has_api_key: z.boolean(),
});

export type SettingsResponse = z.infer<typeof SettingsResponseSchema>;

export const SettingsUpdateSchema = z.object({
  openai_api_key: z.string().optional(),
  default_model: z.string().optional(),
});

export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;

export const ValidateKeyResponseSchema = z.object({
  valid: z.boolean(),
  models: z.array(z.string()),
});

export type ValidateKeyResponse = z.infer<typeof ValidateKeyResponseSchema>;
