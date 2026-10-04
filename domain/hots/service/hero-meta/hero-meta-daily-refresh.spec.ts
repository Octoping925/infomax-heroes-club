import { describe, expect, it, vi } from "vitest";
import { refreshHeroMetaDaily, refreshHeroMetaMapsDaily, type HeroMetaDailySource, type HeroMetaDailyStore } from "./hero-meta-daily-refresh";

const overallRaw = { data: [{ name: "Ana", games_played: 120, wins: 60, losses: 60, win_rate: 50, pick_rate: 10 }] };
const groupedRaw = { data: {
  "Alterac Pass": [{ name: "Yrel", games_played: 120, wins: 60, losses: 60, win_rate: 50, pick_rate: 10 }],
} };

function setup(mapResult: Awaited<ReturnType<HeroMetaDailySource["fetchStats"]>> = { kind: "ready", raw: groupedRaw }) {
  const store = {
    get: vi.fn(async () => null),
    claimDaily: vi.fn(async () => true),
    claimMapDaily: vi.fn(async () => true),
    saveReady: vi.fn(async () => {}),
    savePending: vi.fn(async () => {}),
    saveFailure: vi.fn(async () => {}),
    saveMapReady: vi.fn(async () => {}),
    saveMapPending: vi.fn(async () => {}),
    saveMapFailure: vi.fn(async () => {}),
  } as unknown as HeroMetaDailyStore;
  const source: HeroMetaDailySource = {
    getLatestMajorSubPatch: vi.fn(async () => "2.55.17"),
    fetchStats: vi.fn(async () => ({ kind: "ready" as const, raw: overallRaw })),
    fetchMapStats: vi.fn(async () => mapResult),
    pollJob: vi.fn(async () => ({ kind: "ready" as const, raw: groupedRaw })),
  };
  return { store, source };
}

describe("refreshHeroMetaDaily map datasets", () => {
  it("collects only the requested all-map audience", async () => {
    const deps = setup();
    const results = await refreshHeroMetaDaily({
      now: new Date("2026-09-28T00:00:00.000Z"), deadline: Date.now() + 10_000, audience: "all", ...deps,
    });

    expect(results).toEqual([{ audience: "all", status: "ready", patch: "2.55.17", rows: 1, error: undefined }]);
    expect(deps.source.fetchStats).toHaveBeenCalledTimes(1);
    expect(deps.source.fetchStats).toHaveBeenCalledWith("2.55.17", "all");
    expect(deps.store.claimDaily).toHaveBeenCalledTimes(1);
  });

  it("collects only the requested grouped-map audience", async () => {
    const deps = setup();
    const results = await refreshHeroMetaMapsDaily({
      now: new Date("2026-09-28T00:00:00.000Z"), deadline: Date.now() + 10_000, audience: "platinum_plus", ...deps,
    });

    expect(results).toEqual([{ audience: "platinum_plus", status: "ready", patch: "2.55.17", rows: 0, mapRows: 1, error: undefined }]);
    expect(deps.source.fetchMapStats).toHaveBeenCalledTimes(1);
    expect(deps.source.fetchMapStats).toHaveBeenCalledWith("2.55.17", "platinum_plus");
    expect(deps.store.claimMapDaily).toHaveBeenCalledTimes(1);
  });

  it("refreshes only overall stats without touching grouped map requests", async () => {
    const deps = setup();
    const results = await refreshHeroMetaDaily({ now: new Date("2026-09-28T00:00:00.000Z"), deadline: Date.now() + 10_000, audience: "all", ...deps });

    expect(deps.source.fetchStats).toHaveBeenCalledTimes(1);
    expect(deps.source.fetchMapStats).not.toHaveBeenCalled();
    expect(deps.store.saveReady).toHaveBeenCalledTimes(1);
    expect(deps.store.saveMapReady).not.toHaveBeenCalled();
    expect(results.every((result) => result.status === "ready" && result.rows === 1)).toBe(true);
  });

  it("persists a pending grouped-map job in the map-only refresh", async () => {
    const deps = setup({ kind: "pending", jobPath: "/jobs/map-123", retryAfterSeconds: 60 });
    const results = await refreshHeroMetaMapsDaily({ now: new Date("2026-09-28T00:00:00.000Z"), deadline: Date.now() + 5_000, audience: "all", ...deps });

    expect(deps.source.fetchStats).not.toHaveBeenCalled();
    expect(deps.source.fetchMapStats).toHaveBeenCalledTimes(1);
    expect(deps.store.saveReady).not.toHaveBeenCalled();
    expect(deps.store.saveMapPending).toHaveBeenCalledTimes(1);
    expect(deps.store.savePending).not.toHaveBeenCalled();
    expect(results.every((result) => result.status === "pending")).toBe(true);
  });

  it("uses map-specific daily claims and only saves map datasets", async () => {
    const deps = setup();
    const results = await refreshHeroMetaMapsDaily({ now: new Date("2026-09-28T00:00:00.000Z"), deadline: Date.now() + 10_000, audience: "all", ...deps });

    expect(deps.store.claimMapDaily).toHaveBeenCalledTimes(1);
    expect(deps.store.claimDaily).not.toHaveBeenCalled();
    expect(deps.source.fetchStats).not.toHaveBeenCalled();
    expect(deps.source.fetchMapStats).toHaveBeenCalledTimes(1);
    expect(deps.store.saveMapReady).toHaveBeenCalledTimes(1);
    expect(deps.store.saveReady).not.toHaveBeenCalled();
    expect(results.every((result) => result.status === "ready" && result.rows === 0 && result.mapRows === 1)).toBe(true);
  });
});
