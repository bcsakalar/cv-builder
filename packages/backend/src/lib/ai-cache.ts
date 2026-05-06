// ═══════════════════════════════════════════════════════════
// AI Response Cache — Redis hash-based memoization
//
// Caches expensive deterministic-ish AI tool outputs keyed by
// (tool, locale, model, inputHash). Repeated calls with the
// exact same input return cached output, saving model time.
//
// Tools that mutate per-call (e.g. coverLetter where the user
// expects fresh creative output) should pass `bypass: true`.
// ═══════════════════════════════════════════════════════════

import crypto from "node:crypto";
import { logger } from "./logger";
import { cacheGet, cacheSet, cacheDeletePattern } from "./redis";

const PREFIX = "ai:cache:v1";
const DEFAULT_TTL_SECONDS = 60 * 30; // 30 minutes

export interface AICacheKey {
  tool: string;
  locale?: string;
  model?: string;
  /** Stable input descriptor — must be JSON-serializable */
  input: unknown;
}

function hashInput(value: unknown): string {
  const json = JSON.stringify(value, Object.keys(value as object ?? {}).sort());
  return crypto.createHash("sha256").update(json).digest("hex").slice(0, 24);
}

export function buildCacheKey(key: AICacheKey): string {
  const locale = key.locale ?? "en";
  const model = key.model ?? "default";
  return `${PREFIX}:${key.tool}:${locale}:${model}:${hashInput(key.input)}`;
}

export async function getCachedAI<T>(key: AICacheKey): Promise<T | null> {
  try {
    const cacheKey = buildCacheKey(key);
    const hit = await cacheGet<T>(cacheKey);
    if (hit) {
      logger.debug("AI cache hit", { tool: key.tool, locale: key.locale });
    }
    return hit;
  } catch (error) {
    logger.warn("AI cache read failed", {
      tool: key.tool,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setCachedAI<T>(
  key: AICacheKey,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  try {
    const cacheKey = buildCacheKey(key);
    await cacheSet(cacheKey, value, ttlSeconds);
  } catch (error) {
    logger.warn("AI cache write failed", {
      tool: key.tool,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Invalidate all cached entries for a given tool (e.g. after CV update). */
export async function invalidateAICacheForTool(tool: string): Promise<void> {
  try {
    await cacheDeletePattern(`${PREFIX}:${tool}:*`);
  } catch (error) {
    logger.warn("AI cache invalidation failed", {
      tool,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Wrap an executor with cache-aside pattern. */
export async function withAICache<T>(
  key: AICacheKey,
  ttlSeconds: number,
  executor: () => Promise<T>
): Promise<{ value: T; cached: boolean }> {
  const hit = await getCachedAI<T>(key);
  if (hit !== null) {
    return { value: hit, cached: true };
  }

  const value = await executor();
  await setCachedAI(key, value, ttlSeconds);
  return { value, cached: false };
}
