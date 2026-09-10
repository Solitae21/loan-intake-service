import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1_000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

const createAuthRateLimiter = () =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: MAX_ATTEMPTS_PER_WINDOW,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => {
      req.log.warn("authentication rate limit exceeded");
      res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many authentication attempts; try again later",
          requestId: String(req.id),
        },
      });
    },
  });

// Keep independent counters so failed login attempts cannot prevent registration
// (and vice versa), while each endpoint remains strictly limited per IP.
export const loginRateLimiter = createAuthRateLimiter();
export const registerRateLimiter = createAuthRateLimiter();
