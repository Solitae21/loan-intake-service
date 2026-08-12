import express from "express";
import helmet from "helmet";
import cors from "cors";
import type { Request, Response } from "express";
import { requestId } from "./middleware/request-id.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { pinoHttp } from "pino-http";
import { logger } from "../infra/logger.js";
import { authRouter } from "./auth/auth.routes.js";
import { applicationRouter } from "./applications/applications.routes.js";

export const app = express();

app.use(requestId);
app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
app.use(helmet());
app.use(cors({ exposedHeaders: ["Location"] }));
app.use(express.json({ limit: "100kb" }));

app.use("/auth", authRouter);
app.use("/applications", applicationRouter);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use(notFoundHandler);
app.use(errorHandler);
