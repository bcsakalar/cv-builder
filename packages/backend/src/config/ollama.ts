// ═══════════════════════════════════════════════════════════
// Ollama Configuration
// ═══════════════════════════════════════════════════════════

import { env } from "./env";

export const ollamaConfig = {
  baseUrl: env.OLLAMA_URL,
  defaultModel: env.OLLAMA_MODEL,
  codeModel: env.OLLAMA_CODE_MODEL,
  repoAnalysisModel: env.OLLAMA_REPO_ANALYSIS_MODEL,
  repoAnalysisTemperature: env.OLLAMA_REPO_ANALYSIS_TEMPERATURE,
  embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
  timeout: 120000,
  maxRetries: 2,
};
