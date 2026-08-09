import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "./config.js";

export const prisma = new PrismaClient({
  datasourceUrl: config.DATABASE_URL,
  omit: { user: { passwordHash: true } },
  log: config.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
