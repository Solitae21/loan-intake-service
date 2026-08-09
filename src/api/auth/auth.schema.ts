import { z } from "zod";

export const idParamSchema = z.object({ id: z.uuid() });
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().max(100).default(20),
});

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(12).max(128),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().length(64),
});

export type RefreshInput = z.infer<typeof refreshSchema>;
