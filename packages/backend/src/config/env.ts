// ═══════════════════════════════════════════════════════════
// Environment Configuration — Zod-validated
// ═══════════════════════════════════════════════════════════

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string(),

  // Ollama
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("llama3.2"),
  OLLAMA_CODE_MODEL: z.string().default("codellama"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text"),

  // Security
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ENCRYPTION_KEY: z.string().length(32),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Upload
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(5242880),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    const missing = Object.entries(formatted)
      .filter(([key]) => key !== "_errors")
      .map(([key, val]) => `  ${key}: ${JSON.stringify(val)}`)
      .join("\n");

    throw new Error(
      `Invalid environment variables:\n${missing}\n\nCheck your .env file against .env.example`
    );
  }

  return result.data;
}

export const env = loadEnv();
