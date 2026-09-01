import z, { ZodError } from "zod";
import { AppError, isAppError } from "../errors.js";
import { config } from "../../infra/config.js";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { InvalidTransitionError } from "../../domain/applications/application-state.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Cannot ${req.method} ${req.path}`));
};

function normalize(err: unknown): AppError {
  if (isAppError(err)) return err;

  if (err instanceof InvalidTransitionError) {
    return AppError.conflict(err.message, {
      from: err.from,
      to: err.to,
    });
  }

  if (err instanceof ZodError) {
    return AppError.validation(
      "Request Validation failed",
      z.treeifyError(err),
    );
  }

  if (
    err instanceof SyntaxError &&
    "status" in err &&
    err.status === 400 &&
    "body" in err
  ) {
    return new AppError("Malformed JSON in request body", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  }

  return AppError.internal(undefined, err);
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const appError = normalize(err);

  if (appError.statusCode >= 500)
    req.log.error({ err: appError, code: appError.code }, appError.message);
  else req.log.warn({ code: appError.code }, appError.message);

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.isOperational
        ? appError.message
        : "Something went wrong",
      ...(appError.isOperational && appError.details !== undefined
        ? { details: appError.details }
        : {}),
      requestId: req.id,
    },
  });
};
