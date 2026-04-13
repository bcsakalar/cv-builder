// ═══════════════════════════════════════════════════════════
// Redis Configuration
// ═══════════════════════════════════════════════════════════

import { env } from "./env";

export const redisConfig = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null as null,
  retryStrategy: (times: number): number | null => {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
};
