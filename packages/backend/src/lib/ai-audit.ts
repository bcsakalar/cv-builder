// ═══════════════════════════════════════════════════════════
// AI Call Audit Logger
//
// Structured logging wrapper for every AI tool invocation.
// Captures: tool, model, locale, duration, input/output sizes,
// success/failure, error message, cached/fresh flag.
//
// Logs land in the application logger as structured JSON so
// they can be shipped to any aggregator (Loki, Datadog, etc.).
// ═══════════════════════════════════════════════════════════

import { logger } from "./logger";

export interface AIAuditEntry {
  tool: string;
  userId: string;
  cvId?: string | null;
  model?: string;
  locale?: string;
  durationMs: number;
  promptTokensApprox?: number;
  outputTokensApprox?: number;
  success: boolean;
  cached?: boolean;
  fallbackModel?: string | null;
  error?: string;
}

/** Rough token estimate (chars/4 heuristic — good enough for logs). */
export function approximateTokens(value: string | unknown): number {
  if (!value) return 0;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return Math.ceil(text.length / 4);
}

export function recordAIAudit(entry: AIAuditEntry): void {
  const payload = {
    audit: "ai_call",
    ...entry,
  };

  if (entry.success) {
    logger.info("AI audit", payload);
  } else {
    logger.warn("AI audit (failure)", payload);
  }
}

/** Convenience wrapper: time an async AI executor and record audit. */
export async function withAudit<T>(
  base: Omit<AIAuditEntry, "durationMs" | "success" | "error">,
  executor: () => Promise<T>,
  options?: { extractOutputTokens?: (value: T) => number }
): Promise<T> {
  const start = Date.now();
  try {
    const value = await executor();
    const durationMs = Date.now() - start;
    recordAIAudit({
      ...base,
      durationMs,
      success: true,
      outputTokensApprox: options?.extractOutputTokens
        ? options.extractOutputTokens(value)
        : approximateTokens(value),
    });
    return value;
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    recordAIAudit({
      ...base,
      durationMs,
      success: false,
      error: message,
    });
    throw error;
  }
}
