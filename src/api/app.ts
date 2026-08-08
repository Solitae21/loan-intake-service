import express from "express";
import helmet from "helmet";
import cors from "cors";
import type { Request, Response } from "express";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});
