// ═══════════════════════════════════════════════════════════
// Ollama Configuration
// ═══════════════════════════════════════════════════════════

import { env } from "./env";

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export const ollamaConfig = {
  baseUrl: env.OLLAMA_URL ?? "http://localhost:11434",
  defaultModel: env.OLLAMA_MODEL ?? "qwen3.5:9b",
  codeModel: env.OLLAMA_CODE_MODEL ?? "qwen3.5:9b",
  repoAnalysisModel: env.OLLAMA_REPO_ANALYSIS_MODEL ?? "qwen2.5-coder:14b",
  structuredModel: env.OLLAMA_STRUCTURED_MODEL ?? "granite4.1:8b",
  fallbackModel: env.OLLAMA_FALLBACK_MODEL ?? "qwen2.5:7b",
  repoAnalysisFallbackModels: parseCsv(env.OLLAMA_REPO_ANALYSIS_FALLBACK_MODELS),
  repoAnalysisTemperature: env.OLLAMA_REPO_ANALYSIS_TEMPERATURE ?? 0.35,
  embeddingModel: env.OLLAMA_EMBEDDING_MODEL ?? "bge-m3",
  requiredModels: unique([
    ...parseCsv(env.OLLAMA_REQUIRED_MODELS),
    env.OLLAMA_MODEL,
    env.OLLAMA_CODE_MODEL,
    env.OLLAMA_REPO_ANALYSIS_MODEL,
    env.OLLAMA_STRUCTURED_MODEL,
    env.OLLAMA_EMBEDDING_MODEL,
  ]),
  defaultNumCtx: env.OLLAMA_DEFAULT_NUM_CTX ?? 8192,
  repoAnalysisNumCtx: env.OLLAMA_REPO_ANALYSIS_NUM_CTX ?? 8192,
  defaultMaxTokens: env.OLLAMA_MAX_TOKENS ?? 1536,
  repoAnalysisMaxTokens: env.OLLAMA_REPO_ANALYSIS_MAX_TOKENS ?? 4096,
  keepAlive: env.OLLAMA_KEEP_ALIVE ?? "10m",
  timeout: 120000,
  maxRetries: 2,
};

export const repoAnalysisModelCandidates = unique([
  ollamaConfig.repoAnalysisModel,
  ...ollamaConfig.repoAnalysisFallbackModels,
  ollamaConfig.codeModel,
  ollamaConfig.defaultModel,
  ollamaConfig.fallbackModel,
]);
