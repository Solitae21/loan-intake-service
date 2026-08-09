import type { RequestHandler } from "express";
import { AppError } from "../errors.js";
import { verifyAccessToken } from "../../infra/tokens.js";
import type { Role } from "../../generated/prisma/enums.js";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Missing bearer token"));
  }

  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired access token"));
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
