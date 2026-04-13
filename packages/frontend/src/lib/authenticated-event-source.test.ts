// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth.store";
import { createAuthenticatedEventSource } from "./authenticated-event-source";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

describe("createAuthenticatedEventSource", () => {
  afterEach(() => {
    fetchMock.mockReset();
    useAuthStore.setState({ token: null, user: null, hydrated: false });
  });

  it("sends the active auth token as a bearer header", async () => {
    useAuthStore.setState({ token: "token-123", user: null, hydrated: true });
    fetchMock.mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
    });

    createAuthenticatedEventSource("http://localhost:3002/api/github/analyses/abc/stream");

    await Promise.resolve();

    const firstCall = fetchMock.mock.calls[0];

    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toBe("http://localhost:3002/api/github/analyses/abc/stream");
    expect(firstCall?.[1]).toMatchObject({
      headers: { Authorization: "Bearer token-123" },
    });
  });
});