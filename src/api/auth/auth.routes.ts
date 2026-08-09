import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { credentialsSchema } from "./auth.schema.js";
import { login, register } from "../../domain/auth/auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(credentialsSchema),
  async (req, res) => {
    const user = await register(req.body);
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  },
);

authRouter.post("/login", validateBody(credentialsSchema), async (req, res) => {
  const user = await login(req.body);
  res.json({ id: user.id, email: user.email, role: user.role });
});
