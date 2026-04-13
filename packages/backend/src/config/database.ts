// ═══════════════════════════════════════════════════════════
// Database Configuration
// ═══════════════════════════════════════════════════════════

import { env } from "./env";

export const databaseConfig = {
  url: env.DATABASE_URL,
  logging: env.NODE_ENV === "development",
};
