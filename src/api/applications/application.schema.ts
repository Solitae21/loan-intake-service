import { z } from "zod";
import { ApplicationStatus } from "../../generated/prisma/enums.js";
import { listQuerySchema } from "../schemas/common.js";

const money = z.number().positive().max(100_000_000);

export const createApplicationSchema = z.object({
  amount: money,
  term: z.number().int().min(6).max(360),
  monthlyIncome: money,
  purpose: z.string().trim().min(3).max(140),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const listApplicationsQuerySchema = listQuerySchema.extend({
  status: z.enum(ApplicationStatus).optional(),
});

export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
