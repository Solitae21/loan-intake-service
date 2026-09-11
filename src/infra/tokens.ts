import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "./config.js";
import { Role } from "../generated/prisma/enums.js";

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ISSUER = "loan-intake-service";
const AUDIENCE = "loan-intake-api";
const ALGORITHM = "HS256";

const accessPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(Role),
});

export type AccessPayload = { sub: string; role: Role };

export const signAccessToken = (user: { id: string; role: Role }): string =>
  jwt.sign({ role: user.role }, config.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: ACCESS_TTL_SECONDS,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: ALGORITHM,
  });

export const verifyAccessToken = (token: string): AccessPayload => {
  const payload = jwt.verify(token, config.JWT_ACCESS_SECRET, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: [ALGORITHM],
  });
  return accessPayloadSchema.parse(payload);
};

export const hashRefreshToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const generateRefreshToken = () => {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  };
};
