// ═══════════════════════════════════════════════════════════
// Ollama Client Wrapper — with retry, thinking-tag cleanup,
// model validation, and structured output support
// ═══════════════════════════════════════════════════════════

import { ollamaConfig } from "../config/ollama";
import { logger } from "./logger";

// ── Types ────────────────────────────────────────────────

export interface OllamaGenerateOptions {
  model?: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** Force JSON output format (Ollama native) */
  json?: boolean;
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  totalDuration?: number;
}

export interface OllamaEmbeddingResponse {
  embedding?: number[];
  embeddings?: number[][];
}

interface OllamaModelInfo {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
}

// ── Helpers ──────────────────────────────────────────────

/**
 * Some local reasoning-capable models include `<think>...</think>` blocks.
 * Strip them to keep downstream consumers focused on the actual answer.
 * If stripping leaves nothing, attempt to extract JSON from within the think block.
 */
function stripThinkingTags(text: string): string {
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/i);
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // If stripping left us with content, return it
  if (stripped) return stripped;

  // If stripping left nothing, the model put the answer inside <think> tags.
  // Try to extract JSON from inside the thinking block.
  if (thinkMatch) {
    const insideThink = thinkMatch[1]?.trim() ?? "";
    // Look for a JSON object inside the thinking
    const jsonMatch = insideThink.match(/(\{[\s\S]*\})/);
    if (jsonMatch) return jsonMatch[1]!;
    // Return the raw thinking content as fallback
    if (insideThink) return insideThink;
  }

  return text.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Core fetch with retry ────────────────────────────────

async function ollamaFetch<T>(
  endpoint: string,
  body: Record<string, unknown>,
  retries = ollamaConfig.maxRetries
): Promise<T> {
  const url = `${ollamaConfig.baseUrl}${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(ollamaConfig.timeout),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Ollama API error ${response.status}: ${response.statusText}${errorBody ? ` — ${errorBody}` : ""}`
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      const isLast = attempt === retries;
      const errMsg = error instanceof Error ? error.message : String(error);

      if (isLast) {
        logger.error("Ollama request failed after retries", {
          endpoint,
          attempts: attempt + 1,
          error: errMsg,
        });
        throw new Error(
          `Ollama unavailable after ${attempt + 1} attempts: ${errMsg}`
        );
      }

      const delay = Math.min(1000 * 2 ** attempt, 8000);
      logger.warn("Ollama request failed, retrying", {
        endpoint,
        attempt: attempt + 1,
        delay,
        error: errMsg,
      });
      await sleep(delay);
    }
  }

  throw new Error("Ollama fetch failed unexpectedly");
}

// ── Generate ─────────────────────────────────────────────

export async function generate(
  options: OllamaGenerateOptions
): Promise<string> {
  const {
    model = ollamaConfig.defaultModel,
    prompt,
    system,
    temperature = 0.7,
    topP,
    json = false,
  } = options;

  logger.debug("Ollama generate", { model, promptLength: prompt.length });

  const body: Record<string, unknown> = {
    model,
    prompt,
    system,
    stream: false,
    options: {
      temperature,
      ...(typeof topP === "number" ? { top_p: topP } : {}),
    },
  };

  // Disable reasoning traces where the local model supports it so downstream
  // consumers receive cleaner output and more stable JSON.
  body.think = false;

  if (json) {
    body.format = "json";
  }

  const response = await ollamaFetch<OllamaGenerateResponse>(
    "/api/generate",
    body
  );

  const raw = response.response ?? "";
  if (!raw) {
    logger.warn("Ollama returned empty response", { model, promptLength: prompt.length });
  }

  return stripThinkingTags(raw);
}

// ── Streaming Generate ───────────────────────────────────

export async function generateStreaming(
  options: OllamaGenerateOptions,
  onChunk: (chunk: string) => void
): Promise<string> {
  const {
    model = ollamaConfig.defaultModel,
    prompt,
    system,
    temperature = 0.7,
  } = options;

  const url = `${ollamaConfig.baseUrl}/api/generate`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= ollamaConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          system,
          stream: true,
          think: false,
          options: { temperature },
        }),
        signal: AbortSignal.timeout(ollamaConfig.timeout),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Ollama streaming error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let insideThink = false;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          try {
            const parsed = JSON.parse(line) as OllamaGenerateResponse;
            if (parsed.response) {
              fullResponse += parsed.response;

              // Filter out <think>...</think> blocks from stream
              if (parsed.response.includes("<think>")) insideThink = true;
              if (insideThink) {
                if (parsed.response.includes("</think>")) {
                  insideThink = false;
                }
                continue;
              }

              onChunk(parsed.response);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer) as OllamaGenerateResponse;
          if (parsed.response) {
            fullResponse += parsed.response;

            if (parsed.response.includes("<think>")) insideThink = true;
            if (!insideThink) {
              onChunk(parsed.response);
            }
          }
        } catch {
          // Ignore trailing partial chunks that are not valid JSON
        }
      }

      return stripThinkingTags(fullResponse);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < ollamaConfig.maxRetries) {
        await sleep(1000 * 2 ** attempt);
      }
    }
  }

  throw lastError ?? new Error("Ollama streaming failed");
}

// ── Embeddings ───────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const legacyRequest = {
    model: ollamaConfig.embeddingModel,
    prompt: text,
  };

  try {
    const response = await ollamaFetch<OllamaEmbeddingResponse>(
      "/api/embeddings",
      legacyRequest
    );

    if (Array.isArray(response.embedding) && response.embedding.length > 0) {
      return response.embedding;
    }

    if (Array.isArray(response.embeddings?.[0]) && response.embeddings[0].length > 0) {
      return response.embeddings[0];
    }
  } catch (error) {
    logger.warn("Legacy Ollama embeddings endpoint failed, retrying with /api/embed", {
      model: ollamaConfig.embeddingModel,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const embedResponse = await ollamaFetch<OllamaEmbeddingResponse>(
    "/api/embed",
    {
      model: ollamaConfig.embeddingModel,
      input: text,
    }
  );

  if (Array.isArray(embedResponse.embedding) && embedResponse.embedding.length > 0) {
    return embedResponse.embedding;
  }

  if (Array.isArray(embedResponse.embeddings?.[0]) && embedResponse.embeddings[0].length > 0) {
    return embedResponse.embeddings[0];
  }

  throw new Error("Ollama embedding response did not contain an embedding vector");
}

// ── Health & Model checks ────────────────────────────────

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(ollamaConfig.baseUrl, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function checkModelAvailable(
  model = ollamaConfig.defaultModel
): Promise<boolean> {
  try {
    const response = await fetch(`${ollamaConfig.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;

    const data = (await response.json()) as { models: OllamaModelInfo[] };
    return data.models.some(
      (m) => m.name === model || m.name.startsWith(`${model}:`) || m.model === model || m.model.startsWith(`${model}:`)
    );
  } catch {
    return false;
  }
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${ollamaConfig.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as { models: OllamaModelInfo[] };
    return data.models.map((m) => m.name);
  } catch {
    return [];
  }
}

// ── Exported client ──────────────────────────────────────

export const ollama = {
  generate,
  generateStreaming,
  generateEmbedding,
  checkHealth: checkOllamaHealth,
  checkModelAvailable,
  getAvailableModels,
};
