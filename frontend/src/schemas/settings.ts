import { z } from "zod";

export const SettingsResponseSchema = z.object({
  default_model: z.string(),
  has_api_key: z.boolean(),
});

export type SettingsResponse = z.infer<typeof SettingsResponseSchema>;

export const SettingsUpdateSchema = z.object({
  default_model: z.string().optional(),
});

export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;

// --- Secret Keys ---

export interface SecretKey {
  id: string;
  platform: string;
  key_name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface SecretKeyCreate {
  platform: string;
  key_name: string;
  secret_key: string;
}

export interface SecretKeyValidateResponse {
  valid: boolean;
  error?: string | null;
}

export interface TransportKeyResponse {
  key: string;
}
