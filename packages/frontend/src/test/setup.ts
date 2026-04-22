import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import i18n from "@/i18n";

function createStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

function ensureStorage(name: "localStorage" | "sessionStorage") {
  const current = globalThis[name];
  const hasStorageApi = current && typeof current.getItem === "function" && typeof current.setItem === "function" && typeof current.clear === "function";

  if (hasStorageApi) {
    return;
  }

  const storage = createStorageMock();
  Object.defineProperty(globalThis, name, {
    value: storage,
    configurable: true,
    enumerable: true,
    writable: true,
  });

  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, {
      value: storage,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  }
}

ensureStorage("localStorage");
ensureStorage("sessionStorage");

beforeEach(async () => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }

  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
});