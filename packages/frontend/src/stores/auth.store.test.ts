// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth.store";

const session = {
  token: "token-123",
  user: {
    id: "user-1",
    email: "demo@cvbuilder.local",
    name: "Demo User",
    avatarUrl: null,
    githubUsername: null,
    createdAt: "2026-04-12T10:00:00.000Z",
    updatedAt: "2026-04-12T10:00:00.000Z",
  },
};

describe("useAuthStore", () => {
  afterEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null, hydrated: false });
  });

  it("stores and clears the active session", () => {
    useAuthStore.getState().setSession(session);

    expect(useAuthStore.getState().token).toBe("token-123");
    expect(useAuthStore.getState().user?.email).toBe("demo@cvbuilder.local");

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("marks the store as hydrated after persistence restore", () => {
    useAuthStore.getState().setHydrated(true);

    expect(useAuthStore.getState().hydrated).toBe(true);
  });
});