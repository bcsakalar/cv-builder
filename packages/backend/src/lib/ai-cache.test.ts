import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const cacheStore = new Map<string, unknown>();

jest.mock("./redis", () => ({
  cacheGet: jest.fn(async (key: string) => (cacheStore.has(key) ? cacheStore.get(key) : null)),
  cacheSet: jest.fn(async (key: string, value: unknown) => {
    cacheStore.set(key, value);
  }),
  cacheDeletePattern: jest.fn(async (pattern: string) => {
    const prefix = pattern.replace(/\*$/, "");
    for (const k of Array.from(cacheStore.keys())) {
      if (k.startsWith(prefix)) cacheStore.delete(k);
    }
  }),
}));

jest.mock("./logger", () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { buildCacheKey, withAICache, invalidateAICacheForTool } from "./ai-cache";

describe("ai-cache", () => {
  beforeEach(() => {
    cacheStore.clear();
  });

  it("buildCacheKey is stable for same input regardless of property order", () => {
    const a = buildCacheKey({ tool: "ats", input: { cvId: "1", locale: "en" } });
    const b = buildCacheKey({ tool: "ats", input: { locale: "en", cvId: "1" } });
    expect(a).toBe(b);
  });

  it("withAICache returns fresh value on miss, cached on hit", async () => {
    const executor = jest.fn(async () => ({ score: 42 }));
    const key = { tool: "ats", input: { cvId: "x" } };

    const first = await withAICache(key, 60, executor);
    expect(first).toEqual({ value: { score: 42 }, cached: false });
    expect(executor).toHaveBeenCalledTimes(1);

    const second = await withAICache(key, 60, executor);
    expect(second).toEqual({ value: { score: 42 }, cached: true });
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("invalidateAICacheForTool removes only matching tool entries", async () => {
    await withAICache({ tool: "ats", input: { cvId: "1" } }, 60, async () => 1);
    await withAICache({ tool: "review", input: { cvId: "1" } }, 60, async () => 2);

    await invalidateAICacheForTool("ats");

    const calls: number[] = [];
    await withAICache({ tool: "ats", input: { cvId: "1" } }, 60, async () => {
      calls.push(1);
      return 99;
    });
    await withAICache({ tool: "review", input: { cvId: "1" } }, 60, async () => {
      calls.push(2);
      return 100;
    });

    // ats should miss (re-run), review should hit (no re-run)
    expect(calls).toEqual([1]);
  });
});
