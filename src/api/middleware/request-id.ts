import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export const requestId: RequestHandler = (req, res, next) => {
  req.id = req.get("x-request-id") ?? randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
};
