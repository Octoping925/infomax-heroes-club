import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refreshMaps } = vi.hoisted(() => ({ refreshMaps: vi.fn() }));
vi.mock("@/config/prisma", () => ({ prisma: {} }));
vi.mock("@/config/heroes-profile", () => ({ heroesProfileDailySource: () => ({}) }));
vi.mock("@/domain/hots/repositories/hero-meta-snapshot", () => ({ createHeroMetaDailyStore: () => ({}) }));
vi.mock("@/domain/hots/service/hero-meta-daily-refresh", () => ({ refreshHeroMetaMapsDaily: refreshMaps }));

import { GET } from "./route";

describe("GET /api/cron/hero-meta/maps", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("HEROES_PROFILE_API_KEY", "test-api-key");
    refreshMaps.mockReset();
    refreshMaps.mockResolvedValue([{ audience: "all", status: "ready", patch: "2.55.17", rows: 0, mapRows: 1200 }]);
  });

  it("requires cron authorization", async () => {
    const response = await GET(new NextRequest("http://localhost/api/cron/hero-meta/maps"));
    expect(response.status).toBe(401);
    expect(refreshMaps).not.toHaveBeenCalled();
  });

  it("runs the map-only refresh operation", async () => {
    const response = await GET(new NextRequest("http://localhost/api/cron/hero-meta/maps", {
      headers: { authorization: "Bearer test-cron-secret" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0].mapRows).toBe(1200);
    expect(refreshMaps).toHaveBeenCalledOnce();
  });
});
