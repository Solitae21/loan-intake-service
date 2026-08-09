import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { credentialsSchema, refreshSchema } from "./auth.schema.js";
import {
  login,
  logout,
  refresh,
  register,
} from "../../domain/auth/auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validate({ body: credentialsSchema }),
  async (req, res) => {
    const user = await register(req.body);
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  },
);

authRouter.post(
  "/login",
  validate({ body: credentialsSchema }),
  async (req, res) => {
    const { user, tokens } = await login(req.body);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    });
  },
);

authRouter.post(
  "/refresh",
  validate({ body: refreshSchema }),
  async (req, res) => {
    res.json(await refresh(req.body.refreshToken));
  },
);

authRouter.post(
  "/logout",
  validate({ body: refreshSchema }),
  async (req, res) => {
    await logout(req.body.refreshToken);
    res.status(204).end();
  },
);
