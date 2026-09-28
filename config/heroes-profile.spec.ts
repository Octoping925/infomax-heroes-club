import { describe, expect, it, vi } from "vitest";
import { heroesProfileSource, parseReferenceOptions, validateJobLocation } from "./heroes-profile";

describe("validateJobLocation", () => {
  it("accepts only Heroes Profile v1 jobs", () => {
    expect(validateJobLocation("/v1/jobs/abc-123")).toBe("/jobs/abc-123");
    expect(validateJobLocation("https://www.heroesprofile.com/api/external/v1/jobs/abc-123")).toBe("/jobs/abc-123");
    expect(() => validateJobLocation("https://evil.example/jobs/abc-123")).toThrow();
    expect(() => validateJobLocation("/v1/heroes/stats")).toThrow();
  });
});

describe("parseReferenceOptions", () => {
  it("extracts unique major patches and playable map names", () => {
    expect(parseReferenceOptions(
      { patches: [{ version: "2.55.17.97771" }, { version: "2.55.16.97039" }, { version: "2.54.4.1" }] },
      { maps: [{ name: "Alterac Pass", playable: 1 }, { name: "Old Map", playable: 0 }] },
    )).toEqual({ patches: ["2.55", "2.54"], maps: ["Alterac Pass"] });
  });
});

describe("heroesProfileSource", () => {
  it("keeps polling the same job when a 202 response omits Location", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ async: true }), {
        status: 202,
        headers: { Location: "/v1/jobs/abc-123", "Retry-After": "10" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ async: true }), {
        status: 202,
        headers: { "Retry-After": "12" },
      }));
    const source = heroesProfileSource("test-key", fetcher);
    const filters = { mode: "sl", region: "ALL", patch: "2.55", map: null, leagueTier: null } as const;

    expect(await source.fetchStats(filters)).toEqual({ kind: "pending", jobPath: "/jobs/abc-123", retryAfterSeconds: 10 });
    expect(await source.pollJob("/jobs/abc-123")).toEqual({ kind: "pending", jobPath: "/jobs/abc-123", retryAfterSeconds: 12 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
