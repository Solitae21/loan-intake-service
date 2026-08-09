import { email } from "zod";
import type { Credentials } from "../../api/auth/auth.schema.js";
import {
  burnTiming,
  hashPassword,
  verifyPassword,
} from "../../infra/password.js";
import { prisma } from "../../infra/prisma.js";
import { AppError } from "../../api/errors.js";
import { Prisma } from "../../generated/prisma/client.js";
import { needsRehash } from "argon2";

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
  return safe;
};
