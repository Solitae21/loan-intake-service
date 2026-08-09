import type { RequestHandler } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";
import { z, type ZodType } from "zod";
import { AppError } from "../errors.js";

type RequestSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

type InferOr<T, Fallback> = T extends ZodType ? z.infer<T> : Fallback;

export const validate =
  <S extends RequestSchemas>(
    schemas: S,
  ): RequestHandler<
    InferOr<S["params"], ParamsDictionary>,
    unknown,
    InferOr<S["body"], unknown>,
    InferOr<S["query"], Query>
  > =>
  (req, _res, next) => {
    const result = z
      .object({
        body: schemas.body ?? z.unknown(),
        params: schemas.params ?? z.unknown(),
        query: schemas.query ?? z.unknown(),
      })
      .safeParse({ body: req.body, params: req.params, query: req.query });

    if (!result.success) {
      return next(
        AppError.validation(
          "Request Validation Failed",
          z.treeifyError(result.error),
        ),
      );
    }

    if (schemas.body) req.body = result.data.body as never;
    if (schemas.params) req.params = result.data.params as never;
    if (schemas.query) {
      Object.defineProperty(req, "query", {
        value: result.data.query,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    }

    next();
  };
