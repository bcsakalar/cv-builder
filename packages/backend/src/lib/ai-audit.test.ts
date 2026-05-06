import { describe, expect, it, jest } from "@jest/globals";

const loggerMock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

jest.mock("./logger", () => ({ logger: loggerMock }));

import { approximateTokens, recordAIAudit, withAudit } from "./ai-audit";

describe("ai-audit", () => {
  it("approximateTokens estimates ~chars/4", () => {
    expect(approximateTokens("a".repeat(40))).toBe(10);
    expect(approximateTokens(undefined)).toBe(0);
    expect(approximateTokens({ a: 1 })).toBeGreaterThan(0);
  });

  it("recordAIAudit emits a structured info log entry", () => {
    loggerMock.info.mockClear();
    recordAIAudit({
      tool: "ats",
      userId: "u1",
      durationMs: 123,
      success: true,
      cached: false,
    });

    expect(loggerMock.info).toHaveBeenCalledTimes(1);
    const [, payload] = loggerMock.info.mock.calls[0]!;
    expect(payload).toMatchObject({ audit: "ai_call", tool: "ats", success: true, cached: false });
  });

  it("withAudit captures duration and success", async () => {
    loggerMock.info.mockClear();
    const result = await withAudit(
      { tool: "review", userId: "u1" },
      async () => "ok"
    );
    expect(result).toBe("ok");
    const [, payload] = loggerMock.info.mock.calls[0]!;
    expect(payload).toMatchObject({ tool: "review", success: true });
    expect(typeof (payload as { durationMs: number }).durationMs).toBe("number");
  });

  it("withAudit logs failure and rethrows", async () => {
    loggerMock.warn.mockClear();
    await expect(
      withAudit({ tool: "review", userId: "u1" }, async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const [, payload] = loggerMock.warn.mock.calls[0]!;
    expect(payload).toMatchObject({ tool: "review", success: false, error: "boom" });
  });
});
