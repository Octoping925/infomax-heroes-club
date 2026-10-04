import { describe, expect, it, vi } from "vitest";
import { loadHeroMeta, type HeroMetaSnapshot, type HeroMetaSnapshotStore, type HeroMetaSource } from "./hero-meta-loader";
import type { HeroMetaFilters } from "./hero-meta-filters";

const filters: HeroMetaFilters = { mode: "sl", region: "ALL", patch: "2.55", map: null, leagueTier: null };
const raw = { data: [{ name: "Ana", games_played: 100, wins: 60, losses: 40, pick_rate: 10, ban_rate: 2 }] };
const now = new Date("2026-09-28T00:00:00.000Z");

function setup(snapshot: HeroMetaSnapshot | null = null, claim = true) {
  let current = snapshot;
  const store: HeroMetaSnapshotStore = {
    getOrCreate: vi.fn(async () => current ?? { stats: null, fetchedAt: null, jobPath: null, nextPollAt: null, leaseUntil: null }),
    claim: vi.fn(async () => claim),
    saveReady: vi.fn(async (_key, stats, fetchedAt) => { current = { stats, fetchedAt, jobPath: null, nextPollAt: null, leaseUntil: null }; }),
    savePending: vi.fn(async () => {}),
    saveError: vi.fn(async () => {}),
  };
  const source: HeroMetaSource = {
    fetchStats: vi.fn(async () => ({ kind: "ready" as const, raw })),
    pollJob: vi.fn(async () => ({ kind: "ready" as const, raw })),
  };
  return { store, source };
}

describe("loadHeroMeta", () => {
  it("returns a fresh snapshot without an upstream request", async () => {
    const deps = setup({ stats: [{ hero: "Ana", games: 100, wins: 60, losses: 40, winRate: 60, pickRate: 10, banRate: 2 }], fetchedAt: now, jobPath: null, nextPollAt: null, leaseUntil: null });
    const result = await loadHeroMeta(filters, { ...deps, now });
    expect(result.status).toBe("ready");
    expect(result.rows).toHaveLength(1);
    expect(deps.source.fetchStats).not.toHaveBeenCalled();
  });

  it("persists a cold 202 job and returns pending", async () => {
    const deps = setup();
    vi.mocked(deps.source.fetchStats).mockResolvedValue({ kind: "pending", jobPath: "/jobs/abc-123", retryAfterSeconds: 10 });
    const result = await loadHeroMeta(filters, { ...deps, now, nowAfterRequest: () => now });
    expect(result.status).toBe("pending");
    expect(deps.store.savePending).toHaveBeenCalledWith(expect.any(String), "/jobs/abc-123", new Date(now.getTime() + 10_000));
  });

  it("honors Retry-After above five minutes from the time the response arrives", async () => {
    const deps = setup();
    const responseAt = new Date(now.getTime() + 8_000);
    vi.mocked(deps.source.fetchStats).mockResolvedValue({ kind: "pending", jobPath: "/jobs/abc-123", retryAfterSeconds: 600 });
    const result = await loadHeroMeta(filters, { ...deps, now, nowAfterRequest: () => responseAt });
    expect(result.retryAfterSeconds).toBe(600);
    expect(deps.store.savePending).toHaveBeenCalledWith(expect.any(String), "/jobs/abc-123", new Date(responseAt.getTime() + 600_000));
  });

  it("waits until Retry-After and then polls the saved job", async () => {
    const future = new Date(now.getTime() + 10_000);
    const deps = setup({ stats: null, fetchedAt: null, jobPath: "/jobs/abc-123", nextPollAt: future, leaseUntil: null });
    expect((await loadHeroMeta(filters, { ...deps, now })).status).toBe("pending");
    expect(deps.source.pollJob).not.toHaveBeenCalled();
    const result = await loadHeroMeta(filters, { ...deps, now: future });
    expect(result.status).toBe("ready");
    expect(deps.source.pollJob).toHaveBeenCalledWith("/jobs/abc-123");
  });

  it("keeps stale rows when the upstream request fails", async () => {
    const deps = setup({ stats: [{ hero: "Ana", games: 100, wins: 60, losses: 40, winRate: 60, pickRate: 10, banRate: 2 }], fetchedAt: new Date("2026-09-26T00:00:00.000Z"), jobPath: null, nextPollAt: null, leaseUntil: null });
    vi.mocked(deps.source.fetchStats).mockRejectedValue(new Error("quota exceeded"));
    const result = await loadHeroMeta(filters, { ...deps, now });
    expect(result.status).toBe("stale");
    expect(result.rows).toHaveLength(1);
    expect(deps.store.saveError).toHaveBeenCalled();
  });

  it("does not cache a non-empty vendor response whose rows lack required metrics", async () => {
    const deps = setup();
    vi.mocked(deps.source.fetchStats).mockResolvedValue({ kind: "ready", raw: { data: [{ name: "Ana", wins: 60 }] } });
    const result = await loadHeroMeta(filters, { ...deps, now });
    expect(result.status).toBe("error");
    expect(deps.store.saveReady).not.toHaveBeenCalled();
  });

  it("does not duplicate an upstream call when another request owns the refresh", async () => {
    const deps = setup(null, false);
    expect((await loadHeroMeta(filters, { ...deps, now })).status).toBe("pending");
    expect(deps.source.fetchStats).not.toHaveBeenCalled();
  });

  it("re-reads the snapshot when its atomic refresh claim loses a race", async () => {
    const stale = { stats: [{ hero: "Ana" as const, games: 100, wins: 60, losses: 40, winRate: 60, pickRate: 10, banRate: 2 }], fetchedAt: new Date(now.getTime() - 86_400_000), jobPath: null, nextPollAt: null, leaseUntil: null };
    const fresh = { ...stale, fetchedAt: now };
    const deps = setup(stale, false);
    vi.mocked(deps.store.getOrCreate).mockResolvedValueOnce(stale).mockResolvedValueOnce(fresh);
    const result = await loadHeroMeta(filters, { ...deps, now });
    expect(result.status).toBe("ready");
    expect(result.updatedAt).toBe(now.toISOString());
    expect(deps.source.fetchStats).not.toHaveBeenCalled();
  });
});
