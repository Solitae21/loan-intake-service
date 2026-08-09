import type { AccessPayload } from "../infra/tokens.js";

declare global {
  namespace Express {
    interface Request {
      user?: AccessPayload;
    }
  }
}

export {};
