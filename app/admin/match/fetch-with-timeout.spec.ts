import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./fetch-with-timeout";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("fetchWithTimeout", () => {
  it("aborts a request after the configured timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })));

    const request = fetchWithTimeout("/slow", {}, 100);
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(100);

    await rejection;
  });

  it("clears the timeout after a successful response", async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(fetchWithTimeout("/fast", {}, 100)).resolves.toMatchObject({ status: 204 });

    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
  });
});
