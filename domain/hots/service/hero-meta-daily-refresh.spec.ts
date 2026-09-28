import { describe, expect, it, vi } from "vitest";
import { refreshHeroMetaDaily, type HeroMetaDailySource, type HeroMetaDailyStore } from "./hero-meta-daily-refresh";

const overallRaw = { data: [{ name: "Ana", games_played: 120, wins: 60, losses: 60, win_rate: 50, pick_rate: 10 }] };
const groupedRaw = { data: {
  "Alterac Pass": [{ name: "Yrel", games_played: 120, wins: 60, losses: 60, win_rate: 50, pick_rate: 10 }],
} };

function setup(mapResult: Awaited<ReturnType<HeroMetaDailySource["fetchStats"]>> = { kind: "ready", raw: groupedRaw }) {
  const store = {
    get: vi.fn(async () => null),
    claimDaily: vi.fn(async () => true),
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
  it("collects and stores one grouped map query per audience alongside overall stats", async () => {
    const deps = setup();
    const results = await refreshHeroMetaDaily({ now: new Date("2026-09-28T00:00:00.000Z"), deadline: Date.now() + 10_000, ...deps });

    expect(deps.source.fetchStats).toHaveBeenCalledTimes(2);
    expect(deps.source.fetchMapStats).toHaveBeenCalledTimes(2);
    expect(deps.store.saveReady).toHaveBeenCalledTimes(2);
    expect(deps.store.saveMapReady).toHaveBeenCalledTimes(2);
    expect(results.every((result) => result.status === "ready" && result.mapRows === 1)).toBe(true);
  });

  it("persists a pending map job separately when the overall query is ready", async () => {
    const deps = setup({ kind: "pending", jobPath: "/jobs/map-123", retryAfterSeconds: 60 });
    const results = await refreshHeroMetaDaily({ now: new Date("2026-09-28T00:00:00.000Z"), deadline: Date.now() + 5_000, ...deps });

    expect(deps.store.saveReady).toHaveBeenCalledTimes(2);
    expect(deps.store.saveMapPending).toHaveBeenCalledTimes(2);
    expect(deps.store.savePending).not.toHaveBeenCalled();
    expect(results.every((result) => result.status === "pending")).toBe(true);
  });
});
