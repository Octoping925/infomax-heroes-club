import { describe, expect, it, vi } from "vitest";
import { getLatestMajorSubPatch, heroesProfileDailySource, heroesProfileSource, HeroesProfileRequestError, parseLatestMajorSubPatch, parseReferenceOptions, validateJobLocation } from "./heroes-profile";

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

  it("accepts a flat patch list containing version strings", () => {
    expect(parseReferenceOptions(
      { patches: ["2.55.17.97771", "2.54.4.1"] },
      { maps: [{ name: "Alterac Pass", playable: 1 }] },
    ).patches).toEqual(["2.55", "2.54"]);
  });
});

describe("parseLatestMajorSubPatch", () => {
  it("selects the newest valid subpatch rather than the major patch aggregate", () => {
    expect(parseLatestMajorSubPatch({ patches: [
      { game_version: "2.55.9.98000" },
      { game_version: "2.55.17.97771" },
      { game_version: "2.55.16.97039" },
      { game_version: "2.56.1.1", valid_globals: false },
    ] })).toBe("2.55.17");
  });

  it("throws when patch options do not include a major subpatch", () => {
    expect(() => parseLatestMajorSubPatch({ patches: [{ version: "2.55" }] })).toThrow("메이저 서브 패치");
  });

  it("reads the current subpatch from the Heroes Profile patches endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      patches: [{ game_version: "2.55.17.97771" }],
    })));
    await expect(getLatestMajorSubPatch("test-key", fetcher)).resolves.toBe("2.55.17");
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

describe("heroesProfileDailySource", () => {
  it("requests all playable map groups in one query for the selected audience", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: {} })));
    const source = heroesProfileDailySource("test-key", fetcher);

    await source.fetchMapStats("2.55.17", "platinum_plus");

    const url = String(fetcher.mock.calls[0]?.[0]);
    expect(url).toContain("group_by_map=true");
    expect(url).toContain("timeframe_type=major_grouped");
    expect(url).toContain("timeframe=2.55.17");
    expect(url).toContain("game_type=sl");
    expect(url).toContain("league_tier=4%2C5%2C6");
    expect(url).not.toContain("game_map=");
  });

  it("uses major subpatch filters for overall hero stats too", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    const source = heroesProfileSource("test-key", fetcher);

    await source.fetchStats({ mode: "sl", region: "ALL", patch: "2.55.17", map: null, leagueTier: null });

    const url = String(fetcher.mock.calls[0]?.[0]);
    expect(url).toContain("timeframe_type=major_grouped");
    expect(url).toContain("timeframe=2.55.17");
  });
});

describe("HeroesProfileRequestError", () => {
  it.each([
    [401, "API 키 인증"],
    [403, "플랜"],
    [429, "요청 한도"],
  ])("explains HTTP %s distinctly", (status, expectedMessage) => {
    expect(new HeroesProfileRequestError(status).message).toContain(expectedMessage);
  });
});
