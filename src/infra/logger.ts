import pino from "pino";
import { config } from "./config.js";

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "req.body.password",
      "req.body.currentPassword",
      "req.body.newPassword",
      "req.body.token",
      "req.body.accessToken",
      "req.body.refreshToken",
      "password",
      "currentPassword",
      "newPassword",
      "authorization",
      "token",
      "accessToken",
      "refreshToken",
      "*.password",
      "*.currentPassword",
      "*.newPassword",
      "*.authorization",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "passwordHash",
      "*.passwordHash",
    ],
    censor: "[REDACTED]",
  },
  ...(config.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});
