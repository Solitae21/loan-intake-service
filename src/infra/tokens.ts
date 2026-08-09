import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import type { Role } from "../generated/prisma/enums.js";

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ISSUER = "loan-intake-service";

export type AccessPayload = { sub: string; role: Role };

export const signAccessToken = (user: { id: string; role: Role }): string =>
  jwt.sign({ role: user.role }, config.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: ACCESS_TTL_SECONDS,
    issuer: ISSUER,
  });

export const verifyAccessToken = (token: string): AccessPayload => {
  const payload = jwt.verify(token, config.JWT_ACCESS_SECRET, {
    issuer: ISSUER,
  }) as jwt.JwtPayload;
  return { sub: payload.sub as string, role: payload.role as Role };
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
