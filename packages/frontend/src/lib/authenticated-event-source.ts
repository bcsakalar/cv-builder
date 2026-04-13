import { useAuthStore } from "@/stores/auth.store";

function dispatchMessage(target: AuthenticatedEventStream, data: string): void {
  target.onmessage?.(new MessageEvent("message", { data }));
}

function dispatchError(target: AuthenticatedEventStream): void {
  target.onerror?.(new Event("error"));
}

class AuthenticatedEventStream {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private readonly controller = new AbortController();

  constructor(private readonly url: string) {
    void this.connect();
  }

  close(): void {
    this.controller.abort();
  }

  private async connect(): Promise<void> {
    try {
      const token = useAuthStore.getState().token;
      const response = await fetch(this.url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: this.controller.signal,
      });

      if (!response.ok || !response.body) {
        dispatchError(this);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!this.controller.signal.aborted) {
        const { done, value } = await reader.read();

        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventBlock of events) {
          const data = eventBlock
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");

          if (data) {
            dispatchMessage(this, data);
          }
        }
      }
    } catch {
      if (!this.controller.signal.aborted) {
        dispatchError(this);
      }
    }
  }
}

export function createAuthenticatedEventSource(url: string): EventSource {
  const eventSourceUrl = new URL(url, window.location.origin);
  return new AuthenticatedEventStream(eventSourceUrl.toString()) as unknown as EventSource;
}