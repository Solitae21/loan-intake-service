import type { Credentials } from "../../api/auth/auth.schema.js";
import {
  burnTiming,
  hashPassword,
  verifyPassword,
  needsRehash,
} from "../../infra/password.js";
import { prisma } from "../../infra/prisma.js";
import { AppError } from "../../api/errors.js";
import { Prisma } from "../../generated/prisma/client.js";
import { logger } from "../../infra/logger.js";
import {
  ACCESS_TTL_SECONDS,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../../infra/tokens.js";
import type { Role } from "../../generated/prisma/enums.js";

type TokenSubject = { id: string; role: Role };

const issueTokens = async (user: TokenSubject) => {
  const { token, tokenHash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { tokenHash, userId: user.id, expiresAt },
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken: token,
    tokenType: "Bearer" as const,
    expiresAt: ACCESS_TTL_SECONDS,
  };
};

const revokeAllForUser = (userId: string) =>
  prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

export const register = async (input: Credentials) => {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: { email: input.email, passwordHash },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw AppError.conflict("Email already registered");
    }
    throw e;
  }
};

export const login = async (input: Credentials) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    omit: { passwordHash: false },
  });

  if (!user) {
    await burnTiming();
    throw AppError.unauthorized("Invalid email or password");
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    throw AppError.unauthorized("Invalid email or password");
  }

  if (needsRehash(user.passwordHash)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.password) },
    });
  }

  const { passwordHash: _, ...safe } = user;
  return { user: safe, tokens: await issueTokens(user) };
};

export const refresh = async (presented: string) => {
  const tokenHash = hashRefreshToken(presented);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  if (stored.revokedAt) {
    await revokeAllForUser(stored.userId);
    logger.warn(
      { userId: stored.userId, tokenId: stored.id },
      "refresh token reuse detected, revoked all sessions",
    );
    throw AppError.unauthorized("Invalid refresh token");
  }

  if (stored.expiresAt <= new Date()) {
    throw AppError.unauthorized("Refresh token expired");
  }

  const claimed = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (claimed.count === 0) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  return issueTokens(stored.user);
};

export const logout = async (presented: string) => {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(presented), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
