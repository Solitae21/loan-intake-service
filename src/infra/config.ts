import z from "zod"
import "dotenv/config"

const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    RABBITMQ_URL: z.string().url(),
})

export const config = schema.parse(process.env);