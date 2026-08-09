import type { RequestHandler } from "express";
import { z, type ZodType } from "zod";
import { AppError } from "../errors.js";

export const validateBody =
  <T extends ZodType>(schema: T): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        AppError.validation(
          "Request validation failed",
          z.treeifyError(result.error),
        ),
      );
    }
    req.body = result.data;
    next();
  };
