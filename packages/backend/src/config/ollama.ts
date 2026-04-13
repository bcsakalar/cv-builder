// ═══════════════════════════════════════════════════════════
// Ollama Configuration
// ═══════════════════════════════════════════════════════════

import { env } from "./env";

export const ollamaConfig = {
  baseUrl: env.OLLAMA_URL,
  defaultModel: env.OLLAMA_MODEL,
  codeModel: env.OLLAMA_CODE_MODEL,
  embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
  timeout: 120000,
  maxRetries: 2,
};
