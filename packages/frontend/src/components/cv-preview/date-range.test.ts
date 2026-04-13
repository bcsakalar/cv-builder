// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { formatPreviewDateRange } from "./date-range";

describe("formatPreviewDateRange", () => {
  it("renders an ongoing range without leaking null", () => {
    expect(formatPreviewDateRange("2025-01", null, false, "en")).toBe("Jan 2025 – Present");
  });

  it("renders both dates when an end date exists", () => {
    expect(formatPreviewDateRange("2025-01", "2025-03", false, "en")).toBe("Jan 2025 – Mar 2025");
  });
});