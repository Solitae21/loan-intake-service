export type ErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

type AppErrorOptions = {
  statusCode: number;
  code: ErrorCode;
  /** true = a case you anticipated and whose message is safe to show a client */
  isOperational?: boolean;
  details?: unknown;
  cause?: unknown;
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly isOperational: boolean;
  readonly details: unknown;

  constructor(message: string, opts: AppErrorOptions) {
    super(message, { cause: opts.cause });
    this.name = new.target.name;
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.isOperational = opts.isOperational ?? true;
    this.details = opts.details;
    Error.captureStackTrace?.(this, new.target);
  }

  static notFound(message = "Resource not found", details?: unknown) {
    return new AppError(message, {
      statusCode: 404,
      code: "NOT_FOUND",
      details,
    });
  }

  static unauthorized(message = "Authentication required", details?: unknown) {
    return new AppError(message, {
      statusCode: 401,
      code: "UNAUTHORIZED",
      details,
    });
  }

  static forbidden(
    message: "You do not have access to this resource",
    details?: unknown,
  ) {
    return new AppError(message, {
      statusCode: 403,
      code: "FORBIDDEN",
      details,
    });
  }

  static conflict(message = "Resource already exists", details?: unknown) {
    return new AppError(message, {
      statusCode: 409,
      code: "FORBIDDEN",
      details,
    });
  }

  static validation(message = "Request Validation failed", details?: unknown) {
    return new AppError(message, {
      statusCode: 422,
      code: "VALIDATION_ERROR",
      details,
    });
  }

  static internal(message = "Something went wrong", cause?: unknown) {
    return new AppError(message, {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      isOperational: false,
      cause,
    });
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
