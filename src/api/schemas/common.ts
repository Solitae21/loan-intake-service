import { z } from "zod";

export const idParamSchema = z.object({ id: z.cuid2() });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
