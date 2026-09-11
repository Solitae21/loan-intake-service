import z from "zod";
import "dotenv/config";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  RABBITMQ_URL: z.string().url(),
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  API_DOCS_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((value) =>
      value === undefined ? undefined : value === "true",
    ),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  FORCE_SCORING_FAILURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = schema.parse(process.env);
const corsOrigins = (parsed.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

for (const origin of corsOrigins) {
  const url = new URL(origin);
  if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) {
    throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`);
  }
}

if (parsed.NODE_ENV === "production" && parsed.CORS_ORIGINS === undefined) {
  throw new Error("CORS_ORIGINS must be explicitly set in production");
}

export const config = {
  ...parsed,
  CORS_ORIGINS: corsOrigins,
  API_DOCS_ENABLED:
    parsed.API_DOCS_ENABLED ?? parsed.NODE_ENV !== "production",
};
