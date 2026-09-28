import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSnapshot = vi.fn();
vi.mock("@/config/prisma", () => ({ prisma: {} }));
vi.mock("@/domain/hots/repositories/hero-meta-snapshot", () => ({
  createHeroMetaDailyStore: () => ({ get: getSnapshot }),
}));

import { GET } from "./route";

const row = {
  hero: "Jaina",
  games: 200,
  wins: 110,
  losses: 90,
  winRate: 55,
  pickRate: 12,
  banRate: 5,
};

describe("GET /api/tier/heroes", () => {
  beforeEach(() => {
    getSnapshot.mockReset();
    getSnapshot.mockResolvedValue({
      stats: [row],
      patch: "2.55",
      fetchedAt: new Date("2026-09-28T00:00:00.000Z"),
      mapStats: { SkyTemple: [row] },
      mapPatch: "2.54",
      mapFetchedAt: new Date("2026-09-27T00:00:00.000Z"),
    });
  });

  it("returns saved map rows and map-specific freshness without changing all-map data", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes?audience=all&map=SkyTemple"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.map).toBe("SkyTemple");
    expect(body.patch).toBe("2.54");
    expect(body.updatedAt).toBe("2026-09-27T00:00:00.000Z");
    expect(body.maps).toEqual([{ id: "SkyTemple", name: "하늘 사원" }]);
    expect(body.rows).toHaveLength(1);
  });

  it("keeps the all-map query backed by the original snapshot", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes?audience=all"));
    const body = await response.json();

    expect(body.map).toBeNull();
    expect(body.patch).toBe("2.55");
    expect(body.updatedAt).toBe("2026-09-28T00:00:00.000Z");
  });

  it("returns pending when a requested map snapshot is not stored yet", async () => {
    getSnapshot.mockResolvedValueOnce({ stats: [row], patch: "2.55", fetchedAt: new Date(), mapStats: null, mapPatch: null, mapFetchedAt: null });
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes?audience=all&map=Hanamura"));
    const body = await response.json();

    expect(body.status).toBe("pending");
    expect(body.rows).toEqual([]);
  });

  it("rejects unknown maps", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tier/heroes?audience=all&map=not-a-map"));
    expect(response.status).toBe(400);
    expect(getSnapshot).not.toHaveBeenCalled();
  });
});
