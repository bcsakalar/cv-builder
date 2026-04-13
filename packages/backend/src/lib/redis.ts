// ═══════════════════════════════════════════════════════════
// Redis Client (ioredis)
// ═══════════════════════════════════════════════════════════

import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function formatRedisError(err: unknown): string {
  if (err instanceof AggregateError) {
    return err.errors
      .map((item) => (item instanceof Error ? item.message : String(item)))
      .filter(Boolean)
      .join(" | ") || "Aggregate connection failure";
  }

  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message) {
      return `${err.message || err.name}: ${cause.message}`;
    }

    return err.message || err.name;
  }

  return String(err);
}

function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times: number): number | null => {
      if (times > 3) {
        logger.error("Redis: max retries reached, giving up");
        return null;
      }
      return Math.min(times * 200, 2000);
    },
  });

  client.on("connect", () => {
    logger.info("Redis connected");
  });

  client.on("error", (err: Error) => {
    logger.error("Redis error", { error: formatRedisError(err) });
  });

  client.on("close", () => {
    logger.warn("Redis connection closed");
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info("Redis disconnected");
}

// ── Cache Helpers ────────────────────────────────────────

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttl = DEFAULT_TTL
): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value));
}

export async function cacheDelete(key: string): Promise<void> {
  await redis.del(key);
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
