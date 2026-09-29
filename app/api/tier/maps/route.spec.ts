import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSnapshot = vi.fn();
vi.mock("@/config/prisma", () => ({ prisma: {} }));
vi.mock("@/domain/hots/repositories/hero-meta-snapshot", () => ({
  createHeroMetaDailyStore: () => ({ get: getSnapshot }),
}));

import { GET, POST } from "./route";

const heroes = ["Ana", "Anduin", "Auriel", "Brightwing", "Deckard"] as const;
const stats = heroes.map((hero, index) => ({
  hero,
  games: 200,
  wins: 120 - index * 10,
  losses: 80 + index * 10,
  winRate: 60 - index * 5,
  pickRate: 12 - index,
  banRate: 5 - index,
}));

describe("/api/tier/maps", () => {
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    getSnapshot.mockReset();
    getSnapshot.mockResolvedValue({
      stats,
      patch: "2.55.6",
      fetchedAt: new Date("2026-09-28T00:00:00.000Z"),
      mapStats: { SkyTemple: stats },
      mapPatch: "2.55.6",
      mapFetchedAt: new Date("2026-09-28T01:00:00.000Z"),
    });
  });

  it("renders saved map meta tiers for a Dooray map alias without external fetches", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected external fetch"));
    const request = new NextRequest("http://localhost/api/tier/maps", {
      method: "POST",
      body: JSON.stringify({ text: "사막" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body.text).toContain("하늘 사원 메타 티어리스트");
    expect(body.text).toContain("2.55.6");
    expect(body.text).toContain("아나");
    expect(body.text).toContain("Heroes Profile");
    expect(body.responseType).toBe("ephemeral");
    expect(getSnapshot).toHaveBeenCalledWith("all");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["", "없는 맵"])("falls back to all-map tiers for %j", async (map) => {
    const response = await GET(new NextRequest(`http://localhost/api/tier/maps?map=${encodeURIComponent(map)}`));
    const body = await response.json();
    expect(body.text).toContain("전체 맵 메타 티어리스트");
    expect(body.text).toContain("아나");
    expect(body.text).not.toContain("지원하지 않는 맵");
  });

  it("falls back to all-map tiers for a Dooray command without a map", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/tier/maps", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect((await response.json()).text).toContain("전체 맵 메타 티어리스트");
  });

  it("keeps a recognized map pending until its snapshot exists", async () => {
    getSnapshot.mockResolvedValueOnce({ stats, patch: "2.55.6", fetchedAt: new Date(), mapStats: null });
    const response = await GET(new NextRequest("http://localhost/api/tier/maps?map=하늘사원"));
    const body = await response.json();
    expect(body.text).toContain("하늘 사원 메타 티어리스트");
    expect(body.text).toContain("데이터 준비 중");
  });

  it("returns a preparation message when no saved statistics exist", async () => {
    getSnapshot.mockResolvedValueOnce(null);
    const response = await GET(new NextRequest("http://localhost/api/tier/maps"));
    const body = await response.json();
    expect(body.text).toContain("데이터 준비 중");
  });
});
