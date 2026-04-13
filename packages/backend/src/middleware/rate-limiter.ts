// ═══════════════════════════════════════════════════════════
// Rate Limiter Middleware (express-rate-limit + Redis)
// ═══════════════════════════════════════════════════════════

import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../lib/redis";
import { env } from "../config/env";

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "development",
  store: new RedisStore({
    sendCommand: (...args: string[]) => {
      const [cmd, ...rest] = args;
      return redis.call(cmd!, ...rest) as never;
    },
    prefix: "rl:global:",
  }),
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later",
    },
  },
});

export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => {
      const [cmd, ...rest] = args;
      return redis.call(cmd!, ...rest) as never;
    },
    prefix: "rl:strict:",
  }),
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests for this operation",
    },
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => {
      const [cmd, ...rest] = args;
      return redis.call(cmd!, ...rest) as never;
    },
    prefix: "rl:ai:",
  }),
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "AI request rate limit exceeded, please wait",
    },
  },
});
